// ==UserScript==
// @name         Panopto User Groups Ripping to CSV (Chunked Download)
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Extract user group info and download as CSV in chunks
// @author       Samuel Chan
// @match        http*://*.cloud.panopto.eu/Panopto/Pages/Admin/Groups/List.aspx
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const force_download_threshold = 20000; // Minimum number of groups to trigger download

    function downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.rel = 'noopener noreferrer';
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function escapeCSV(val) {
        if (typeof val !== 'string') return String(val ?? '');
        return `"${val.replace(/"/g, '""')}"`;
    }

    function getTimestamp(suffix = '') {
        const now = new Date();
        const pad = n => n.toString().padStart(2, '0');
        return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${suffix}`;
    }

    function main() {
        const btn = document.querySelector('.groups-export-btn');
        const notification = document.querySelector('.groups-notification');
        btn.disabled = true;
        notification.textContent = 'Processing...';
        try {
            const ripped = [];
            const headerRow = [
                'group_id',
                'name',
                'external_id',
                'member_count',
                'is_private',
                'is_editable',
                'is_access_editable',
                'is_membership_viewable',
                'group_type',
                'provider_name',
                'provider_description',
                'roles'
            ];
            const pageSize = 1000;
            let totalGroups = null;
            let chunkIndex = 1;
            let totalFetched = 0;

            async function fetchGroupsPage(page) {
                const url = `/Panopto/Api/Groups?page=${page + 1}&sortDescending=false&sort=Name&pageSize=${pageSize}&searchTerm=&computeTotalCount=true`;
                const res = await fetch(url, {
                    method: 'GET',
                    credentials: 'same-origin'
                });
                if (!res.ok) throw new Error('Failed to fetch groups');
                const data = await res.json();
                return data;
            }

            function rippedToCSV(rows) {
                return rows.map(row => row.map(escapeCSV).join(',')).join('\r\n');
            }

            function downloadChunk(rippedChunk, chunkIndex) {
                const rows = [headerRow];
                for (const item of rippedChunk) {
                    rows.push([
                        item.group_id,
                        item.name,
                        item.external_id,
                        item.member_count,
                        item.is_private,
                        item.is_editable,
                        item.is_access_editable,
                        item.is_membership_viewable,
                        item.group_type,
                        item.provider_name,
                        item.provider_description,
                        JSON.stringify(item.roles.map(role => ({
                            id: role.Id || '',
                            name: role.Name || '',
                            system_default: role.SystemDefault ?? '',
                            hide_from_share_dropdown: role.HideFromShareDropDown ?? ''
                        })))
                    ]);
                }
                const csv = rippedToCSV(rows);
                downloadCSV(csv, `groups_${getTimestamp('_chunk' + chunkIndex)}.csv`);
            }

            (async function ripAllGroups() {
                let page = 0;
                notification.textContent = 'Fetching groups...';
                while (true) {
                    const data = await fetchGroupsPage(page);
                    if (totalGroups === null && Array.isArray(data)) {
                        totalGroups = data.length < pageSize ? totalFetched + data.length : totalFetched + pageSize * 10;
                    }
                    if (Array.isArray(data) && data.length === 0) break;
                    for (const group of data) {
                        ripped.push({
                            group_id: group.Id || '',
                            name: group.Name || '',
                            external_id: group.ExternalId || '',
                            member_count: group.MemberCount ?? '',
                            is_private: group.IsPrivate ?? '',
                            is_editable: group.IsEditable ?? '',
                            is_access_editable: group.IsAccessEditable ?? '',
                            is_membership_viewable: group.IsMembershipViewable ?? '',
                            group_type: group.GroupType ?? '',
                            provider_name: group.Provider?.Name || '',
                            provider_description: group.Provider?.Description || '',
                            roles: group.Roles || []
                        });
                        totalFetched++;
                        // If threshold reached, download chunk and reset
                        if (ripped.length >= force_download_threshold) {
                            notification.textContent = `Threshold reached (${totalFetched} groups). Downloading chunk ${chunkIndex}...`;
                            downloadChunk(ripped, chunkIndex);
                            chunkIndex++;
                            ripped.length = 0;
                        }
                    }
                    notification.textContent = `Fetched ${totalFetched} groups...`;
                    if (!Array.isArray(data) || data.length < pageSize) break;
                    page++;
                }
                // Download any remaining groups
                if (ripped.length > 0) {
                    notification.textContent = `Finalizing... Downloading last chunk (${chunkIndex})`;
                    downloadChunk(ripped, chunkIndex);
                }
                btn.disabled = false;
                notification.textContent = 'CSV download(s) completed!';
            })().catch(error => {
                console.error('Error fetching groups:', error);
                btn.disabled = false;
                notification.textContent = 'An error occurred while fetching groups. Check console for details.';
            });

        } catch (error) {
            console.error('Error:', error);
            btn.disabled = false;
            notification.textContent = 'An error occurred while processing. Check console for details.';
        }
    }

    // Create and append button to #oldHeader
    window.addEventListener('load', () => {
        const header = document.getElementById('oldHeader');
        if (header) {
            const headerText = header.querySelector('#contentHeaderText');
            const btn = document.createElement('button');
            btn.classList.add('groups-export-btn');
            btn.textContent = 'Export Groups to CSV';
            btn.style.marginTop = '10px';
            btn.setAttribute('type', 'button');
            btn.addEventListener('click', main);
            header.appendChild(btn);

            const notification = document.createElement('span');
            notification.classList.add('groups-notification');
            notification.style.display = 'inline-block';
            notification.style.marginLeft = '10px';
            notification.textContent = 'Click the button to export groups to CSV';
            header.appendChild(notification);

            function toggleGroupsButtonVisibility() {
                if (headerText && headerText.textContent.includes('Groups')) {
                    btn.style.display = 'inline-block';
                } else {
                    btn.style.display = 'none';
                }
            }
            toggleGroupsButtonVisibility();
        }
    });
})();

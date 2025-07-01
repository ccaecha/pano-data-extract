// ==UserScript==
// @name         Panopto Folders Ripping to CSV
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Extract folder info and download as CSV
// @author       Samuel Chan
// @match        http*://*.cloud.panopto.eu/Panopto/Pages/Folders/List.aspx
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

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
        if (typeof val !== 'string' && val !== null && val !== undefined) return String(val);
        if (val === null || val === undefined) return '';
        return `"${val.replace(/"/g, '""')}"`;
    }

    function main() {
        const btn = document.querySelector('.folders-export-btn');
        const notification = document.querySelector('.folders-notification');
        btn.disabled = true;
        notification.textContent = 'Processing...';
        try {
            const ripped = [];
            const rows = [[
                'folder_id', 'folder_name', 'folder_type', 'parent_folder_id', 'parent_folder_name',
                'can_create_folders', 'can_create_sessions', 'can_download', 'department_id', 'is_creator',
                'is_dropbox', 'session_count', 'user_can_move_session_destination', 'podcast_enabled',
                'affiliation_name', 'presenters', 'abstract', 'context', 'deliveries_specified_order'
            ]];
            const pageSize = 2000;
            let totalFolders = null;

            async function fetchFoldersPage(page) {
                const payload = {
                    queryParameters: {
                        IncludeDeliveryCounts: true,
                        IncludePresenters: true,
                        endDate: null,
                        includeSandboxes: true,
                        maxResults: pageSize,
                        page: page,
                        query: null,
                        sortAscending: true,
                        sortColumn: 0,
                        startDate: null
                    }
                };
                const res = await fetch('https://ucl.cloud.panopto.eu/Panopto/Services/Data.svc/GetFolders', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json; charset=UTF-8'
                    },
                    body: JSON.stringify(payload),
                    credentials: 'same-origin'
                });
                if (!res.ok) throw new Error('Failed to fetch folders');
                const data = await res.json();
                return data.d;
            }

            (async function ripAllFolders() {
                let page = 0;
                let fetched = 0;
                notification.textContent = 'Fetching folders...';
                while (true) {
                    const data = await fetchFoldersPage(page);
                    if (totalFolders === null) totalFolders = data.TotalNumber;
                    for (const folder of data.Results) {
                        ripped.push({
                            folder_id: folder.ID || '',
                            folder_name: folder.Name || '',
                            folder_type: folder.FolderType,
                            parent_folder_id: folder.ParentFolderId || '',
                            parent_folder_name: folder.ParentFolderName || '',
                            can_create_folders: folder.CanCreateFolders,
                            can_create_sessions: folder.CanCreateSessions,
                            can_download: folder.CanDownload,
                            department_id: folder.DepartmentId || '',
                            is_creator: folder.IsCreator,
                            is_dropbox: folder.IsDropbox,
                            session_count: folder.SessionCount,
                            user_can_move_session_destination: folder.UserCanMoveSessionDestination,
                            podcast_enabled: folder.PodcastEnabled,
                            affiliation_name: folder.AffiliationName || '',
                            presenters: JSON.stringify(
                                (folder.Presenters || []).map(p => ({
                                    FullName: p.FullName,
                                    UserKey: p.UserKey
                                }))
                            ),
                            abstract: folder.Abstract || '',
                            context: JSON.stringify(
                                (folder.Context || []).map(item => {
                                    const { __type, ...rest } = item;
                                    return rest;
                                })
                            ),
                            deliveries_specified_order: folder.DeliveriesSpecifiedOrder
                        });
                    }
                    fetched += data.Results.length;
                    notification.textContent = `Fetched ${fetched} of ${totalFolders} folders...`;
                    if (fetched >= totalFolders || !data.Results.length) break;
                    page++;
                }
                for (const item of ripped) {
                    rows.push([
                        item.folder_id,
                        item.folder_name,
                        item.folder_type,
                        item.parent_folder_id,
                        item.parent_folder_name,
                        item.can_create_folders,
                        item.can_create_sessions,
                        item.can_download,
                        item.department_id,
                        item.is_creator,
                        item.is_dropbox,
                        item.session_count,
                        item.user_can_move_session_destination,
                        item.podcast_enabled,
                        item.affiliation_name,
                        item.presenters,
                        item.abstract,
                        item.context,
                        item.deliveries_specified_order
                    ]);
                }
                const csv = rows.map(row => row.map(escapeCSV).join(',')).join('\r\n');
                const now = new Date();
                const pad = n => n.toString().padStart(2, '0');
                const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
                downloadCSV(csv, `folders_${timestamp}.csv`);
                btn.disabled = false;
                notification.textContent = 'CSV downloaded successfully!';
            })().catch(error => {
                console.error('Error fetching folders:', error);
                btn.disabled = false;
                notification.textContent = 'An error occurred while fetching folders. Check console for details.';
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
            btn.classList.add('folders-export-btn');
            btn.textContent = 'Export Folders to CSV';
            btn.style.marginTop = '10px';
            btn.setAttribute('type', 'button');
            btn.addEventListener('click', main);
            header.appendChild(btn);

            const notification = document.createElement('span');
            notification.classList.add('folders-notification');
            notification.style.display = 'inline-block';
            notification.style.marginLeft = '10px';
            notification.textContent = 'Click the button to export folders to CSV';
            header.appendChild(notification);

            function toggleFoldersButtonVisibility() {
                if (headerText && headerText.textContent.includes('Folders')) {
                    btn.style.display = 'inline-block';
                } else {
                    btn.style.display = 'none';
                }
            }
            toggleFoldersButtonVisibility();
        }
    });
})();

// ==UserScript==
// @name         Panopto Users Ripping to CSV
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Extract user info and download as CSV
// @author       Samuel Chan
// @match        http*://*.cloud.panopto.eu/Panopto/Pages/Admin/Users/List.aspx
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
        if (typeof val !== 'string') return '';
        return `"${val.replace(/"/g, '""')}"`;
    }

    function main() {
        const btn = document.querySelector('.users-export-btn');
        const notification = document.querySelector('.users-notification');
        btn.disabled = true;
        notification.textContent = 'Processing...';
        try {
            const ripped = [];
            const rows = [['user_key', 'user_id', 'full_name', 'email', 'affiliation_name', 'is_internal', 'date_added', 'last_login', 'system_role', 'creator_roles', 'viewer_roles', 'roles']];
            const pageSize = 1000; // 250;
            let totalUsers = null;

            async function fetchUsersPage(page) {
                const payload = {
                    queryParameters: {
                        endDate: null,
                        maxResults: pageSize,
                        page: page,
                        query: null,
                        role: null,
                        roleIds: null,
                        sortAscending: true,
                        sortColumn: 0,
                        startDate: null
                    }
                };
                const res = await fetch('https://ucl.cloud.panopto.eu/Panopto/Services/Data.svc/GetUsers', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json; charset=UTF-8'
                    },
                    body: JSON.stringify(payload),
                    credentials: 'same-origin'
                });
                if (!res.ok) throw new Error('Failed to fetch users');
                const data = await res.json();
                return data.d;
            }

            (async function ripAllUsers() {
                let page = 0;
                let fetched = 0;
                notification.textContent = 'Fetching users...';
                function formatPanoptoDate(dateStr) {
                    if (!dateStr) return '';
                    // Panopto date format: "/Date(1716552466000)/"
                    const match = /\/Date\((\d+)\)\//.exec(dateStr);
                    if (!match) return '';
                    const date = new Date(Number(match[1]));
                    const pad = n => n.toString().padStart(2, '0');
                    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
                }
                while (true) {
                    const data = await fetchUsersPage(page);
                    if (totalUsers === null) totalUsers = data.TotalNumber;
                    for (const user of data.Results) {

                        ripped.push({
                            user_key: user.UserKey || '',
                            user_id: user.ID || '',
                            full_name: user.FullName || '',
                            email: user.Email || '',
                            affiliation_name: user.AffiliationName || '',
                            is_internal: user.IsInternal || false,
                            date_added: user.DateAdded,
                            last_login: user.LastLogin,
                            system_role: user.SystemRole || '',
                            creator_roles: user.CreatorRoles || '',
                            viewer_roles: user.ViewerRoles || '',
                            roles: user.Roles || []
                        });
                    }
                    fetched += data.Results.length;
                    notification.textContent = `Fetched ${fetched} of ${totalUsers} users...`;
                    if (fetched >= totalUsers || !data.Results.length) break;
                    page++;
                }
                for (const item of ripped) {
                    rows.push([
                        item.user_key,
                        item.user_id,
                        item.full_name,
                        item.email,
                        item.affiliation_name,
                        item.is_internal,
                        formatPanoptoDate(item.date_added),
                        formatPanoptoDate(item.last_login),
                        item.system_role,
                        item.creator_roles,
                        item.viewer_roles,
                        JSON.stringify(item.roles.map(role => {
                            var r = {
                                id: role.ID || '',
                                name: role.Name || '',
                            };
                            if (role.HideFromShareDropDown) {
                                r.hide_from_share_dropdown = role.HideFromShareDropDown;
                            }
                            if (role.SystemDefault) {
                                r.system_default = role.SystemDefault;
                            }
                            return r;
                        }))
                    ]);
                }
                const csv = rows.map(row => row.map(escapeCSV).join(',')).join('\r\n');
                const now = new Date();
                const pad = n => n.toString().padStart(2, '0');
                const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
                downloadCSV(csv, `users_${timestamp}.csv`);
                btn.disabled = false;
                notification.textContent = 'CSV downloaded successfully!';
            })().catch(error => {
                console.error('Error fetching users:', error);
                btn.disabled = false;
                notification.textContent = 'An error occurred while fetching users. Check console for details.';
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
            btn.classList.add('users-export-btn');
            btn.textContent = 'Export Users to CSV';
            btn.style.marginTop = '10px';
            btn.setAttribute('type', 'button');
            btn.addEventListener('click', main);
            header.appendChild(btn);

            const notification = document.createElement('span');
            notification.classList.add('users-notification');
            notification.style.display = 'inline-block';
            notification.style.marginLeft = '10px';
            notification.textContent = 'Click the button to export users to CSV';
            header.appendChild(notification);

            function toggleUsersButtonVisibility() {
                if (headerText && headerText.textContent.includes('Users')) {
                    btn.style.display = 'inline-block';
                } else {
                    btn.style.display = 'none';
                }
            }
            toggleUsersButtonVisibility();
        }
    });
})();


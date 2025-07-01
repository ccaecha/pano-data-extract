// ==UserScript==
// @name         Panopto Remote Recorders Ripping to CSV
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Extract remote recorder info and download as CSV
// @author       Samuel Chan
// @match        http*://*.cloud.panopto.eu/Panopto/Pages/Admin/RemoteRecorders/List.aspx
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
        const btn = document.querySelector('.recorders-export-btn');
        const notification = document.querySelector('.recorders-notification');
        btn.disabled = true;
        notification.textContent = 'Processing...';
        try {
            const ripped = [];
            const rows = [[
                'ID', 'Name', 'AffiliationName', 'Available', 'MachineIp', 'PrivateId', 'State', 'Version',
                'AudioThumbnail_Src', 'AudioThumbnail_IsSilent', 'AudioThumbnail_MissingData', 'AudioThumbnail_Status', 'AudioThumbnail_Timestamp',
                'VideoThumbnail_Src', 'VideoThumbnail_IsSilent', 'VideoThumbnail_MissingData', 'VideoThumbnail_Status', 'VideoThumbnail_Timestamp'
            ]];
            const pageSize = 500;
            let totalRecorders = null;

            async function fetchRecordersPage(page) {
                const payload = {
                    queryParameters: {
                        query: null,
                        sortColumn: 1,
                        sortAscending: true,
                        maxResults: pageSize,
                        page: page,
                        startDate: null,
                        endDate: null,
                        state: null
                    }
                };
                const res = await fetch('https://ucl.cloud.panopto.eu/Panopto/Services/Data.svc/GetRemoteRecorders', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json; charset=UTF-8'
                    },
                    body: JSON.stringify(payload),
                    credentials: 'same-origin'
                });
                if (!res.ok) throw new Error('Failed to fetch remote recorders');
                const data = await res.json();
                return data.d;
            }

            (async function ripAllRecorders() {
                let page = 0;
                let fetched = 0;
                notification.textContent = 'Fetching remote recorders...';
                while (true) {
                    const data = await fetchRecordersPage(page);
                    if (totalRecorders === null) totalRecorders = data.TotalNumber;
                    for (const rec of data.Results) {
                        ripped.push({
                            ID: rec.ID || '',
                            Name: rec.Name || '',
                            AffiliationName: rec.AffiliationName || '',
                            Available: rec.Available,
                            MachineIp: rec.MachineIp || '',
                            PrivateId: rec.PrivateId,
                            State: rec.State,
                            Version: rec.Version || '',
                            AudioThumbnail_Src: rec.AudioThumbnail?.Src || '',
                            AudioThumbnail_IsSilent: rec.AudioThumbnail?.IsSilent,
                            AudioThumbnail_MissingData: rec.AudioThumbnail?.MissingData,
                            AudioThumbnail_Status: rec.AudioThumbnail?.Status,
                            AudioThumbnail_Timestamp: rec.AudioThumbnail?.Timestamp || '',
                            VideoThumbnail_Src: rec.VideoThumbnail?.Src || '',
                            VideoThumbnail_IsSilent: rec.VideoThumbnail?.IsSilent,
                            VideoThumbnail_MissingData: rec.VideoThumbnail?.MissingData,
                            VideoThumbnail_Status: rec.VideoThumbnail?.Status,
                            VideoThumbnail_Timestamp: rec.VideoThumbnail?.Timestamp || ''
                        });
                    }
                    fetched += data.Results.length;
                    notification.textContent = `Fetched ${fetched} of ${totalRecorders} remote recorders...`;
                    if (fetched >= totalRecorders || !data.Results.length) break;
                    page++;
                }
                for (const item of ripped) {
                    rows.push([
                        item.ID,
                        item.Name,
                        item.AffiliationName,
                        item.Available,
                        item.MachineIp,
                        item.PrivateId,
                        item.State,
                        item.Version,
                        item.AudioThumbnail_Src,
                        item.AudioThumbnail_IsSilent,
                        item.AudioThumbnail_MissingData,
                        item.AudioThumbnail_Status,
                        item.AudioThumbnail_Timestamp,
                        item.VideoThumbnail_Src,
                        item.VideoThumbnail_IsSilent,
                        item.VideoThumbnail_MissingData,
                        item.VideoThumbnail_Status,
                        item.VideoThumbnail_Timestamp
                    ]);
                }
                const csv = rows.map(row => row.map(escapeCSV).join(',')).join('\r\n');
                const now = new Date();
                const pad = n => n.toString().padStart(2, '0');
                const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
                downloadCSV(csv, `remote_recorders_${timestamp}.csv`);
                btn.disabled = false;
                notification.textContent = 'CSV downloaded successfully!';
            })().catch(error => {
                console.error('Error fetching remote recorders:', error);
                btn.disabled = false;
                notification.textContent = 'An error occurred while fetching remote recorders. Check console for details.';
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
            btn.classList.add('recorders-export-btn');
            btn.textContent = 'Export Remote Recorders to CSV';
            btn.style.marginTop = '10px';
            btn.setAttribute('type', 'button');
            btn.addEventListener('click', main);
            header.appendChild(btn);

            const notification = document.createElement('span');
            notification.classList.add('recorders-notification');
            notification.style.display = 'inline-block';
            notification.style.marginLeft = '10px';
            notification.textContent = 'Click the button to export remote recorders to CSV';
            header.appendChild(notification);

            function toggleRecordersButtonVisibility() {
                if (headerText && headerText.textContent.includes('Remote Recorders')) {
                    btn.style.display = 'inline-block';
                } else {
                    btn.style.display = 'none';
                }
            }
            toggleRecordersButtonVisibility();
        }
    });
})();

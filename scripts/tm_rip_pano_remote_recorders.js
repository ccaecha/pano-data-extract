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
                'VideoThumbnail_Src', 'VideoThumbnail_IsSilent', 'VideoThumbnail_MissingData', 'VideoThumbnail_Status', 'VideoThumbnail_Timestamp',
                'Device_1_Record', 'Device_1_DeviceId', 'Device_1_Width', 'Device_1_Height', 'Device_1_Name', 'Device_1_AudioPreviewUrl', 'Device_1_VideoPreviewUrl',
                'Device_1_LastPreviewUpdateDateTime', 'Device_1_Type', 'Device_1_MissingData',
                'Device_2_Record', 'Device_2_DeviceId', 'Device_2_Width', 'Device_2_Height', 'Device_2_Name', 'Device_2_AudioPreviewUrl', 'Device_2_VideoPreviewUrl',
                'Device_2_LastPreviewUpdateDateTime', 'Device_2_Type', 'Device_2_MissingData',
                'LastConnectionDateTime', 'PrimaryAudioDeviceId', 'PrimaryRecordingQualitySettings_AudioBitrate', 'PrimaryRecordingQualitySettings_Framerate',
                'PrimaryRecordingQualitySettings_MultipleBitrateCount', 'PrimaryRecordingQualitySettings_PixelCount', 'PrimaryRecordingQualitySettings_VideoBitrate',
                'PrimaryVideoDeviceId', 'SecondaryRecordingQualitySettings_AudioBitrate', 'SecondaryRecordingQualitySettings_Framerate',
                'SecondaryRecordingQualitySettings_MultipleBitrateCount', 'SecondaryRecordingQualitySettings_PixelCount', 'SecondaryRecordingQualitySettings_VideoBitrate',
                'RemoteRecorderState', 'ScheduleVersion', 
                'DefaultFolder_Id', 'DefaultFolder_Name', 'DefaultFolder_TypeName','DefaultFolder_IsEditable', 'DefaultFolder_IsDepartment', 'DefaultFolder_DepartmentId',
                'DefaultFolder_IsDropbox', 'DefaultFolder_FolderType', 'DefaultFolder_DeliveriesHaveSpecifiedOrder', 'DefaultFolder_PodcastEnabled',
                'DefaultFolder_Parent', 'DefaultFolder_UserCanCreateFolders', 'DefaultFolder_UserCanCreateSessions', 'DefaultFolder_UserCanManageDepartmentSettings',
                'DefaultFolder_UserCanMoveFolder', 'DefaultFolder_UserCanMoveSessionDestination', 'DefaultFolder_IsEnumerable', 'DefaultFolder_HasAccessibleChildren',
                'DefaultFolder_SessionCount', 'DefaultFolder_RepositoryKey', 
                'AccessRoleTypes', 'TimeZoneDisplayInfo_BaseUtcOffset', 'TimeZoneDisplayInfo_TotalHours', 'TimeZoneDisplayInfo_SupportsDST', 'TimeZoneDisplayInfo_DisplayName',
                'IsInheritingTimeZone', 'IsLiveMonitoringBlocked', 'IsPrimaryAudioConfigured', 'IsPrimaryAudioCompatibleWithLiveMonitoring', 'IsLiveMonitoringSupported',
                'RepositoryKey', 'TypeName'
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
                const deviceApiEndpoint = 'https://ucl.cloud.panopto.eu/Panopto/Api/remoteRecorders/';
                for (const item of ripped) {
                    // fetch device-specific data for each recorder
                    const deviceUrl = deviceApiEndpoint + item.ID;
                    const deviceRes = await fetch(deviceUrl, {
                        method: 'GET',
                        credentials: 'same-origin'
                    });
                    notification.textContent = `Fetching devices for recorder ${item.ID}...`;
                    if (!deviceRes.ok) throw new Error('Failed to fetch device data');
                    const deviceData = await deviceRes.json();
                    item.devices = deviceData.Devices || [];
                    item.devices.forEach(device => {
                        device.audio_preview_url = device.AudioPreviewUrl || '';
                        device.video_preview_url = device.VideoPreviewUrl || '';
                        device.last_preview_update_date_time = device.LastPreviewUpdateDateTime || '';
                        device.missing_data = device.MissingData || false;
                    });
                    item.last_connection_date_time = deviceData.LastConnectionDateTime || '';
                    item.primary_audio_device_id = deviceData.PrimaryAudioDeviceId || '';
                    item.primary_recording_quality_settings_audio_bitrate = deviceData.PrimaryRecordingQualitySettings?.AudioBitrate || '';
                    item.primary_recording_quality_settings_framerate = deviceData.PrimaryRecordingQualitySettings?.Framerate || '';
                    item.primary_recording_quality_settings_multiple_bitrate_count = deviceData.PrimaryRecordingQualitySettings?.MultipleBitrateCount || '';
                    item.primary_recording_quality_settings_pixel_count = deviceData.PrimaryRecordingQualitySettings?.PixelCount || '';
                    item.primary_recording_quality_settings_video_bitrate = deviceData.PrimaryRecordingQualitySettings?.VideoBitrate || '';
                    item.primary_video_device_id = deviceData.PrimaryVideoDeviceId || '';
                    item.secondary_recording_quality_settings_audio_bitrate = deviceData.SecondaryRecordingQualitySettings?.AudioBitrate || '';
                    item.secondary_recording_quality_settings_framerate = deviceData.SecondaryRecordingQualitySettings?.Framerate || '';
                    item.secondary_recording_quality_settings_multiple_bitrate_count = deviceData.SecondaryRecordingQualitySettings?.MultipleBitrateCount || '';
                    item.secondary_recording_quality_settings_pixel_count = deviceData.SecondaryRecordingQualitySettings?.PixelCount || '';
                    item.secondary_recording_quality_settings_video_bitrate = deviceData.SecondaryRecordingQualitySettings?.VideoBitrate || '';
                    item.remote_recorder_state = deviceData.State || '';
                    item.schedule_version = deviceData.ScheduleVersion || '';
                    item.default_folder_is_editable = deviceData.DefaultFolder?.IsEditable || false;
                    item.default_folder_is_department = deviceData.DefaultFolder?.IsDepartment || false;
                    item.default_folder_department_id = deviceData.DefaultFolder?.DepartmentId || '';
                    item.default_folder_is_dropbox = deviceData.DefaultFolder?.IsDropbox || false;
                    item.default_folder_folder_type = deviceData.DefaultFolder?.FolderType || '';
                    item.default_folder_deliveries_have_specified_order = deviceData.DefaultFolder?.DeliveriesHaveSpecifiedOrder || false;
                    item.default_folder_podcast_enabled = deviceData.DefaultFolder?.PodcastEnabled || false;
                    item.default_folder_parent = deviceData.DefaultFolder?.Parent || null;
                    item.default_folder_user_can_create_folders = deviceData.DefaultFolder?.UserCanCreateFolders || false;
                    item.default_folder_user_can_create_sessions = deviceData.DefaultFolder?.UserCanCreateSessions || false;
                    item.default_folder_user_can_manage_department_settings = deviceData.DefaultFolder?.UserCanManageDepartmentSettings || false;
                    item.default_folder_user_can_move_folder = deviceData.DefaultFolder?.UserCanMoveFolder || false;
                    item.default_folder_user_can_move_session_destination = deviceData.DefaultFolder?.UserCanMoveSessionDestination || false;
                    item.default_folder_is_enumerable = deviceData.DefaultFolder?.IsEnumerable || false;
                    item.default_folder_has_accessible_children = deviceData.DefaultFolder?.HasAccessibleChildren || false;
                    item.default_folder_session_count = deviceData.DefaultFolder?.SessionCount || null;
                    item.default_folder_repository_key = deviceData.DefaultFolder?.RepositoryKey || '';
                    item.default_folder_id = deviceData.DefaultFolder?.Id || '';
                    item.default_folder_name = deviceData.DefaultFolder?.Name || '';
                    item.default_folder_type_name = deviceData.DefaultFolder?.TypeName || '';
                    item.access_role_types = Array.isArray(deviceData.AccessRoleTypes) ? deviceData.AccessRoleTypes : [];
                    item.time_zone_display_info_base_utc_offset = deviceData.TimeZoneDisplayInfo?.BaseUtcOffset || '';
                    item.time_zone_display_info_total_hours = deviceData.TimeZoneDisplayInfo?.TotalHours || '';
                    item.time_zone_display_info_supports_dst = deviceData.TimeZoneDisplayInfo?.SupportsDST || false;
                    item.time_zone_display_info_display_name = deviceData.TimeZoneDisplayInfo?.DisplayName || '';
                    item.is_inheriting_time_zone = deviceData.IsInheritingTimeZone || false;
                    item.is_live_monitoring_blocked = deviceData.IsLiveMonitoringBlocked || false;
                    item.is_primary_audio_configured = deviceData.IsPrimaryAudioConfigured || false;
                    item.is_primary_audio_compatible_with_live_monitoring = deviceData.IsPrimaryAudioCompatibleWithLiveMonitoring || false;
                    item.is_live_monitoring_supported = deviceData.IsLiveMonitoringSupported || false;
                    item.repository_key = deviceData.RepositoryKey || '';
                    item.type_name = deviceData.TypeName || '';
                }

                function formatPanoptoDate(val) {
                    if (typeof val === 'string' && /^\/Date\((\d+)\)\/$/.test(val)) {
                        const ms = parseInt(val.match(/^\/Date\((\d+)\)\//)[1], 10);
                        const d = new Date(ms);
                        const pad = n => n.toString().padStart(2, '0');
                        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
                    }
                    return val;
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
                        formatPanoptoDate(item.AudioThumbnail_Timestamp),
                        item.VideoThumbnail_Src,
                        item.VideoThumbnail_IsSilent,
                        item.VideoThumbnail_MissingData,
                        item.VideoThumbnail_Status,
                        formatPanoptoDate(item.VideoThumbnail_Timestamp),
                        item.devices[0]?.Record || '',
                        item.devices[0]?.DeviceId || '',
                        item.devices[0]?.Width || '',
                        item.devices[0]?.Height || '',
                        item.devices[0]?.Name || '',
                        item.devices[0]?.audio_preview_url || '',
                        item.devices[0]?.video_preview_url || '',
                        item.devices[0]?.last_preview_update_date_time || '',
                        item.devices[0]?.Type || '',
                        item.devices[0]?.MissingData || '',
                        item.devices[1]?.Record || '',
                        item.devices[1]?.DeviceId || '',
                        item.devices[1]?.Width || '',
                        item.devices[1]?.Height || '',
                        item.devices[1]?.Name || '',
                        item.devices[1]?.audio_preview_url || '',
                        item.devices[1]?.video_preview_url || '',
                        item.devices[1]?.last_preview_update_date_time || '',
                        item.devices[1]?.Type || '',
                        item.devices[1]?.MissingData || '',
                        item.last_connection_date_time || '',
                        item.primary_audio_device_id || '',
                        item.primary_recording_quality_settings_audio_bitrate || '',
                        item.primary_recording_quality_settings_framerate || '',
                        item.primary_recording_quality_settings_multiple_bitrate_count || '',
                        item.primary_recording_quality_settings_pixel_count || '',
                        item.primary_recording_quality_settings_video_bitrate || '',
                        item.primary_video_device_id || '',
                        item.secondary_recording_quality_settings_audio_bitrate || '',
                        item.secondary_recording_quality_settings_framerate || '',
                        item.secondary_recording_quality_settings_multiple_bitrate_count || '',
                        item.secondary_recording_quality_settings_pixel_count || '',
                        item.secondary_recording_quality_settings_video_bitrate || '',
                        item.remote_recorder_state || '',
                        item.schedule_version || '',
                        item.default_folder_id || '',
                        item.default_folder_name || '',
                        item.default_folder_type_name || '',
                        item.default_folder_is_editable || false,
                        item.default_folder_is_department || false,
                        item.default_folder_department_id || '',
                        item.default_folder_is_dropbox || false,
                        item.default_folder_folder_type || '',
                        item.default_folder_deliveries_have_specified_order || false,
                        item.default_folder_podcast_enabled || false,
                        item.default_folder_parent || null,
                        item.default_folder_user_can_create_folders || false,
                        item.default_folder_user_can_create_sessions || false,
                        item.default_folder_user_can_manage_department_settings || false,
                        item.default_folder_user_can_move_folder || false,
                        item.default_folder_user_can_move_session_destination || false,
                        item.default_folder_is_enumerable || false,
                        item.default_folder_has_accessible_children || false,
                        item.default_folder_session_count || null,
                        item.default_folder_repository_key || '',
                        Array.isArray(item.access_role_types) && item.access_role_types.length > 0 ? item.access_role_types.join(',') : '',
                        item.time_zone_display_info_base_utc_offset || '',
                        item.time_zone_display_info_total_hours || '',
                        item.time_zone_display_info_supports_dst || false,
                        item.time_zone_display_info_display_name || '',
                        item.is_inheriting_time_zone || false,
                        item.is_live_monitoring_blocked || false,
                        item.is_primary_audio_configured || false,
                        item.is_primary_audio_compatible_with_live_monitoring || false,
                        item.is_live_monitoring_supported || false,
                        item.repository_key || '',
                        item.type_name || ''
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


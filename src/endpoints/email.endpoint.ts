import type { Request, Response } from 'express';

// Webhook endpoint for dynamic actions
import {app, bot} from '../main';
import {authorised, unAuthorised} from '../utils/authorised';
import * as process from 'node:process';

const uptimePushStatuses: Record<string, string> = {
    "UPTIME_STATUS_SE004NLAM_STORAGE": process.env.UPTIME_STATUS_SE004NLAM_STORAGE,
    "UPTIME_STATUS_SE004NLAM_CPU": process.env.UPTIME_STATUS_SE004NLAM_CPU,
    "UPTIME_STATUS_SE004NLAM_MEMORY": process.env.UPTIME_STATUS_SE004NLAM_MEMORY,
}

const uptimeStatuses: Record<string, boolean> = {
    [uptimePushStatuses['UPTIME_STATUS_SE004NLAM_STORAGE']]: true,
    [uptimePushStatuses['UPTIME_STATUS_SE004NLAM_CPU']]: true,
    [uptimePushStatuses['UPTIME_STATUS_SE004NLAM_MEMORY']]: true,
};

const emailSubjects: Record<string, string> = {
    'DigitalOcean monitoring triggered: Disk Utilization is running high  - db-postgresql-ams3-se0001': uptimePushStatuses['UPTIME_STATUS_SE004NLAM_STORAGE'],
    'DigitalOcean monitoring resolved: Disk Utilization is running high  - db-postgresql-ams3-se0001': uptimePushStatuses['UPTIME_STATUS_SE004NLAM_STORAGE'],
    'DigitalOcean monitoring triggered: CPU is running high  - db-postgresql-ams3-se0001': uptimePushStatuses['UPTIME_STATUS_SE004NLAM_CPU'],
    'DigitalOcean monitoring resolved: CPU is running high  - db-postgresql-ams3-se0001': uptimePushStatuses['UPTIME_STATUS_SE004NLAM_CPU'],
    'DigitalOcean monitoring triggered: Memory Utilization is running high  - db-postgresql-ams3-se0001': uptimePushStatuses['UPTIME_STATUS_SE004NLAM_MEMORY'],
    'DigitalOcean monitoring resolved: Memory Utilization is running high  - db-postgresql-ams3-se0001': uptimePushStatuses['UPTIME_STATUS_SE004NLAM_MEMORY'],
}

export function emailEndpoint() {
    setInterval(() => {
        // Push latest status to uptime service
        console.log('Pushing latest status to uptime service...');
        for (const [id, status] of Object.entries(uptimeStatuses)) {
            console.log(`Pushing status for ${id}: ${status}`);
            void fetch(`${process.env.UPTIME_URL}/api/push/${id}?status=${status ? "up" : 'down'}&msg=${status ? 'OK' : 'NOK'}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            })
        }
        console.log('Pushed latest status to uptime service.');
    }, 1000 * 20); // Every 20 seconds
    app.post('/email', async (req: Request, res: Response) => {
        const token = (req.headers.authorization ?? req.query.token) as string;
        if (!authorised(token)) return unAuthorised(res);

        try {
            // Get its data first item in the arrar and its subject
            const data = req.body.data[0];
            const subject = data.subject;
            const status = subject.includes('resolved')
            const id = emailSubjects[subject];

            if (id) {
                uptimeStatuses[id] = status;
            }

            // Stringify the body
            const body = JSON.stringify(req.body, null, 2);
            console.log(`Received email: ${body}`);
            res.status(201).send('Email received.');
        } catch (error) {
            console.error('Error sending DM:', error);
            res.status(500).send('An error occurred while sending the DM.');
        }
    });
}
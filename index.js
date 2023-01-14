import { publicIpv4 } from 'public-ip';
import { exec } from 'child_process';
import { randomUUID } from 'crypto';

import sysinfo from 'systeminformation';
import express from 'express';
import cors from 'cors';
import fs from 'fs';

let config;

try {
    config = JSON.parse(fs?.readFileSync('./config.json', 'utf-8'));
}
catch {
    config = {};
};

const apiKey = config?.apiKey ?? randomUUID();
const app = express();

app.use(cors());

let server;

const saveToConfig = (data) => {
    try {
        fs?.writeFileSync('./config.json', JSON.stringify(data))
    }
    catch {};
};

const onReady = async () => {
    const { port } = server.address();

    console.clear();

    console.log('---------------------------------------------');
    console.log('SERVER MONITOR CONNECTOR');
    console.log('---------------------------------------------');

    console.log(`\nPort: ${port}`);
    console.log(`API Key: ${apiKey}`);

    console.log('\nFetching Host...');
    console.log(`Host: ${await publicIpv4()}`);

    saveToConfig({ port, apiKey });
};

let data = {};

const setData = async () => data = {
    manufacturer: await (await sysinfo.system()).manufacturer || 'Unknown',
    model: await (await sysinfo.system()).model || 'Unknown',
    serial: await (await sysinfo.system()).serial || 'Unknown',
    bios_vendor: await (await sysinfo.bios()).vendor || 'Unknown',
    bios_serial: await (await sysinfo.bios()).serial || 'Unknown',
    os_kernel: await (await sysinfo.osInfo()).kernel || 'Unknown',
    os_build: await (await sysinfo.osInfo()).build || 'Unknown',
    cpu_usage: Math.floor(await (await sysinfo.currentLoad()).currentLoadSystem) || 0,
    cpu_temperature: await (await sysinfo.cpuTemperature()).main || 0,
    ram_usage: Math.floor((Math.floor(await (await sysinfo.mem()).active * 0.000001) / Math.floor(await (await sysinfo.mem()).total * 0.000001)) * 100) || 0,
    disk_used: Math.floor(await (await sysinfo.fsSize())[0].used * 0.000001) || 0
};

setData();

app.get('/', (_, res) => res.send('Server Monitor connector active.'));

app.get('/:key/validate', (req, res) => {
    const { key } = req?.params;

    res.json({ success: key === apiKey });
});

app.get('/:key/info', async (req, res) => {
    const { key } = req?.params;

    if (key !== apiKey) return res.json({ success: false });

    res.json({
        success: true,
        ...data
    });
});

app.get('/:key/shutdown', async (req, res) => {
    const { key } = req?.params;

    if (key !== apiKey) return res.json({ success: false });

    res.json({ success: true });
    exec('sudo shutdown -h now');
});

app.get('/:key/restart', async (req, res) => {
    const { key } = req?.params;

    if (key !== apiKey) return res.json({ success: false });

    res.json({ success: true });
    exec('sudo shutdown -r now');
});

server = app.listen(config?.port ?? 0, '0.0.0.0', onReady);

setInterval(setData, 5000);

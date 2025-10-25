const axios = require('axios');
const chalk = require('chalk');
const figlet = require('figlet');
const Table = require('cli-table3');
const express = require('express'); // Add Express
const app = express();
const port = process.env.PORT || 10000; // Use environment port or default

// === CONFIGURATION ===
const API_URL = 'https://yoyomedia.in/api/v2';
const API_KEY = '169ca86f21cbfac268ea5e4e2cc8d8ecc48009e77df5148c3932f4520e4cc71c';

// Format: { serviceId: quantity }
const SERVICES = {
    13481: 15,   // Likes (7918 for cheap likes and 4652 for US likes)
    8136: 120   // Views
};

const LINKS = [
    'https://www.instagram.com/reel/DQGrUdojcM4/',
    'https://www.instagram.com/reel/DQKaPjHjZpZ/'
];

// === CLEAN LOG HEADER ===
function printHeader() {
    console.clear();
    console.log(chalk.green(figlet.textSync('View Bot', { horizontalLayout: 'fitted' })));
    console.log(chalk.gray('🤖 bot views and likes\n'));
}

// === GET BALANCE ===
async function getBalance() {
    try {
        const res = await axios.post(API_URL, null, {
            params: {
                key: API_KEY,
                action: 'balance'
            }
        });
        const balance = res.data.balance;
        const currency = res.data.currency;
        console.log(chalk.magenta(`[💰] Current Balance: ${balance} ${currency}\n`));
    } catch (err) {
        console.log(chalk.red(`[❌] Failed to retrieve balance.`));
    }
}

// === PLACE A SINGLE ORDER ===
async function placeOrder(serviceId, quantity, link) {
    try {
        const res = await axios.post(API_URL, null, {
            params: {
                key: API_KEY,
                action: 'add',
                service: serviceId,
                link: link,
                quantity: quantity
            }
        });

        return { link, serviceId, quantity, orderId: res.data.order, status: '✅ Success' };
    } catch (err) {
        return { link, serviceId, quantity, orderId: '-', status: '❌ Failed' };
    }
}

// === HANDLE ALL ORDERS ===
async function orderAllLinks() {
    console.log(chalk.cyan(`[🚀] Starting order batch: ${new Date().toLocaleTimeString()}\n`));

    const table = new Table({
        head: ['Link', 'Service ID', 'Quantity', 'Order ID', 'Status'],
        style: { head: ['green'] }
    });

    for (const link of LINKS) {
        for (const [serviceId, quantity] of Object.entries(SERVICES)) {
            const result = await placeOrder(serviceId, quantity, link);
            table.push([result.link, result.serviceId, result.quantity, result.orderId, result.status]);
        }
    }

    console.log(table.toString());
    await getBalance();
    console.log(chalk.cyan('\n[⏳] Next batch in 40 minutes...\n'));
}

// === COUNTDOWN BETWEEN RUNS ===
function countdown(minutesTotal = 40) {
    let minutesLeft = minutesTotal;

    const interval = setInterval(() => {
        minutesLeft -= 1; // tick every minute

        if (minutesLeft <= 0) {
            console.log(chalk.yellow(`[⏰] Time to run orders!\n`));
            clearInterval(interval);
            // run orders, then restart the countdown
            orderAllLinks().then(() => countdown(minutesTotal));
        } else if (minutesLeft === 20) {
            // warning at 20 minutes left
            console.log(chalk.red(`[⚠️] 20 minutes left — preparing next batch...`));
        } else {
            // optional regular update (every minute)
            console.log(chalk.gray(`[⏳] ${minutesLeft} minutes left...`));
        }
    }, 60 * 1000); // run every 1 minute
}

// === WEB SERVER SETUP ===
app.get('/', (req, res) => {
    res.send(`
        <h1>View Bot is Running</h1>
        <p>This is a background service that automatically processes orders.</p>
        <p>Check the server logs for activity details.</p>
    `);
});

app.listen(port, () => {
    console.log(chalk.green(`[🌐] Server running on port ${port}`));
    printHeader(); // Only once, right here
    // === RUN FIRST TIME AND START LOOP ===
    orderAllLinks().then(() => countdown());
});



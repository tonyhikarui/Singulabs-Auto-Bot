const ethers = require('ethers');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { HttpsProxyAgent } = require('https-proxy-agent');
const chalk = require('chalk');
const banner = require('./banner');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function loadPrivateKeys() {
    try {
        const keys = fs.readFileSync('pk.txt', 'utf8')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'));
        console.log(chalk.green(`Loaded ${keys.length} private keys`));
        return keys;
    } catch (error) {
        console.error(chalk.red('Error loading private keys:', error));
        process.exit(1);
    }
}

function loadProxies() {
    try {
        if (fs.existsSync('proxy.txt')) {
            const proxies = fs.readFileSync('proxy.txt', 'utf8')
                .split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('#'));
            console.log(chalk.green(`Loaded ${proxies.length} proxies`));
            return proxies;
        }
        console.log(chalk.yellow('No proxy.txt found, running in direct mode'));
        return [];
    } catch (error) {
        console.error(chalk.red('Error loading proxies:', error));
        return [];
    }
}

function getProxyAgent(proxy) {
    if (!proxy) return null;
    try {
        if (proxy.toLowerCase().startsWith('socks')) {
            return new SocksProxyAgent(proxy);
        } else {
            return new HttpsProxyAgent(proxy);
        }
    } catch (error) {
        console.error(chalk.red('Error creating proxy agent:', error));
        return null;
    }
}

function deleteLocalFiles(pattern) {
    try {
        const files = fs.readdirSync(__dirname);
        let deletedCount = 0;
        
        for (const file of files) {
            if (file.match(pattern)) {
                fs.unlinkSync(path.join(__dirname, file));
                deletedCount++;
            }
        }
        
        if (deletedCount > 0) {
            console.log(chalk.green(`Deleted ${deletedCount} local files matching pattern: ${pattern}`));
        }
    } catch (error) {
        console.error(chalk.red('Error deleting local files:', error));
    }
}

class ImageComparisonBot {
    constructor(privateKey, proxyUrl = null, walletIndex = 0) {
        this.walletIndex = walletIndex;
        this.provider = new ethers.JsonRpcProvider('https://rpc.odyssey.storyrpc.io/');
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        this.baseUrl = 'https://tools-api.singulabs.xyz';
        this.authToken = null;
        this.webDomain = 'tools.singulabs.xyz';
        this.proxyAgent = getProxyAgent(proxyUrl);
        this.uploadedImages = new Set();
        this.localFiles = new Set();

        this.axiosInstance = axios.create({
            httpsAgent: this.proxyAgent,
            proxy: false
        });

        console.log(chalk.cyan(`[Wallet ${walletIndex + 1}] Initialized: ${this.wallet.address}`));
        if (proxyUrl) {
            console.log(chalk.cyan(`[Wallet ${walletIndex + 1}] Using proxy: ${proxyUrl}`));
        }
    }

    async getServerImages() {
        try {
            const response = await this.axiosInstance.get(
                `${this.baseUrl}/api/images`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.authToken}`,
                        'Origin': `https://${this.webDomain}`,
                        'Referer': `https://${this.webDomain}/`,
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
                    }
                }
            );

            if (response.data.status === "success") {
                return response.data.images;
            }
            return [];
        } catch (error) {
            console.error(chalk.red(`[Wallet ${this.walletIndex + 1}] Failed to get server images:`, error.message));
            return [];
        }
    }

    async deleteServerImages() {
        try {
            const images = await this.getServerImages();
            if (images.length > 0) {
                console.log(chalk.yellow(`[Wallet ${this.walletIndex + 1}] Found ${images.length} images to delete`));
                
                for (const imagePath of images) {
                    try {
                        const imageId = imagePath.split('/').pop();
                        await this.axiosInstance.delete(
                            `${this.baseUrl}/api/images/${imageId}`,
                            {
                                headers: {
                                    'Authorization': `Bearer ${this.authToken}`,
                                    'Origin': `https://${this.webDomain}`,
                                    'Referer': `https://${this.webDomain}/`
                                }
                            }
                        );
                        console.log(chalk.green(`[Wallet ${this.walletIndex + 1}] Deleted server image: ${imageId}`));
                        await sleep(500);
                    } catch (error) {
                        console.error(chalk.red(`[Wallet ${this.walletIndex + 1}] Failed to delete server image: ${error.message}`));
                    }
                }
            }
        } catch (error) {
            console.error(chalk.red(`[Wallet ${this.walletIndex + 1}] Error in deleteServerImages:`, error.message));
        }
    }

    async cleanupLocalFiles() {
        try {
            // Delete both original and compare images for this wallet
            const originalPattern = new RegExp(`original_${this.walletIndex}_\\d+.*\\.jpg`);
            const comparePattern = new RegExp(`compare_${this.walletIndex}_\\d+.*\\.jpg`);
            
            deleteLocalFiles(originalPattern);
            deleteLocalFiles(comparePattern);
            
            this.localFiles.clear();
        } catch (error) {
            console.error(chalk.red(`[Wallet ${this.walletIndex + 1}] Error cleaning up local files:`, error.message));
        }
    }

    isServerError(error) {
        return error.response && error.response.status >= 500 && error.response.status < 600;
    }

    async uploadRandomImage(isOriginal = true, index = 0, retryCount = 0) {
        const timestamp = Date.now();
        const filename = isOriginal 
            ? `original_${this.walletIndex}_${timestamp}_${index}.jpg`
            : `compare_${this.walletIndex}_${timestamp}.jpg`;
        const filepath = path.join(__dirname, filename);

        try {
            const width = Math.floor(Math.random() * 200) + 600;
            const height = Math.floor(Math.random() * 200) + 400;
            const formData = new FormData();
            formData.append('file', Buffer.alloc(width * height), {
                filename,
                contentType: 'image/jpeg'
            });

            const response = await this.axiosInstance.post(
                `${this.baseUrl}/api/${isOriginal ? 'upload' : 'compare'}`,
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                        'Authorization': `Bearer ${this.authToken}`,
                        'Origin': `https://${this.webDomain}`,
                        'Referer': `https://${this.webDomain}/`
                    }
                }
            );

            console.log(chalk.green(`[Wallet ${this.walletIndex + 1}] ${isOriginal ? 'Upload' : 'Compare'} successful`));
            if (isOriginal) {
                this.uploadedImages.add(filename);
            }
            this.localFiles.add(filename);
            return response.data;
        } catch (error) {
            if (error.response?.status === 429 || this.isServerError(error)) {
                const maxRetries = 5;
                if (retryCount < maxRetries) {
                    const baseDelay = error.response?.status === 429 ? 2000 : 5000;
                    const delay = Math.pow(2, retryCount) * baseDelay + Math.random() * 2000;
                    const errorType = error.response?.status === 429 ? 'Rate limited' : 'Server error';
                    
                    console.log(chalk.yellow(
                        `[Wallet ${this.walletIndex + 1}] ${errorType} (${error.response?.status}), ` +
                        `retrying in ${Math.floor(delay/1000)}s (attempt ${retryCount + 1}/${maxRetries})`
                    ));
                    
                    await sleep(delay);
                    return this.uploadRandomImage(isOriginal, index, retryCount + 1);
                }
            }
            console.error(chalk.red(`[Wallet ${this.walletIndex + 1}] ${isOriginal ? 'Upload' : 'Compare'} failed:`, error.message));
            throw error;
        }
    }

    async getNonce() {
        try {
            const response = await this.axiosInstance.get(`${this.baseUrl}/api/nonce`, {
                headers: {
                    'Origin': `https://${this.webDomain}`,
                    'Referer': `https://${this.webDomain}/`
                }
            });
            return response.data.nonce;
        } catch (error) {
            console.error(chalk.red(`[Wallet ${this.walletIndex + 1}] Failed to get nonce:`, error.message));
            throw error;
        }
    }

    async login() {
        try {
            console.log(chalk.yellow(`[Wallet ${this.walletIndex + 1}] Starting login process...`));
            
            const nonce = await this.getNonce();
            const now = new Date();
            const message = `${this.webDomain} wants you to sign in with your Ethereum account:
${this.wallet.address}

Sign in with Ethereum to the app.

URI: https://${this.webDomain}
Version: 1
Chain ID: 1516
Nonce: ${nonce}
Issued At: ${now.toISOString()}`;

            const signature = await this.wallet.signMessage(message);

            const verifyResponse = await this.axiosInstance.post(
                `${this.baseUrl}/api/verify`,
                { message, signature },
                {
                    headers: {
                        'Origin': `https://${this.webDomain}`,
                        'Referer': `https://${this.webDomain}/`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (verifyResponse.data.token) {
                this.authToken = verifyResponse.data.token;
                console.log(chalk.green(`[Wallet ${this.walletIndex + 1}] Login successful`));
                return this.authToken;
            }
            throw new Error('No token received');
        } catch (error) {
            console.error(chalk.red(`[Wallet ${this.walletIndex + 1}] Login failed:`, error.message));
            throw error;
        }
    }

    async getPoints() {
        try {
            if (!this.authToken) throw new Error('Not authenticated');

            const response = await this.axiosInstance.get(
                `${this.baseUrl}/api/points`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.authToken}`,
                        'Origin': `https://${this.webDomain}`,
                        'Referer': `https://${this.webDomain}/`
                    }
                }
            );

            return response.data.points;
        } catch (error) {
            console.error(chalk.red(`[Wallet ${this.walletIndex + 1}] Failed to get points:`, error.message));
            throw error;
        }
    }

    async runCycle() {
        try {
            // Clean up previous files
            await this.deleteServerImages();
            await this.cleanupLocalFiles();
            await sleep(2000 + Math.random() * 1000);

            // Upload 4 original images with random delays
            for (let i = 0; i < 4; i++) {
                await this.uploadRandomImage(true, i);
                await sleep(1000 + Math.random() * 2000);
            }

            // Upload 1 compare image
            await this.uploadRandomImage(false);
            
            await sleep(1000 + Math.random() * 1000);
        } catch (error) {
            throw error;
        }
    }

    async runContinuous() {
        let consecutiveErrors = 0;
        const maxConsecutiveErrors = 3;

        while (true) {
            try {
                console.log(chalk.cyan(`\n[Wallet ${this.walletIndex + 1}] === Starting new cycle ===`));
                console.log(chalk.cyan(`[Wallet ${this.walletIndex + 1}] Time:`, new Date().toISOString()));

                if (!this.authToken) {
                    await this.login();
                }

                const startPoints = await this.getPoints();
                console.log(chalk.yellow(`[Wallet ${this.walletIndex + 1}] Current points:`, startPoints));

                await this.runCycle();
                consecutiveErrors = 0;  // Reset error counter on success

                const endPoints = await this.getPoints();
                console.log(chalk.green(`[Wallet ${this.walletIndex + 1}] Points earned:`, endPoints - startPoints));

                console.log(chalk.yellow(`[Wallet ${this.walletIndex + 1}] Waiting 60 seconds before next cycle...`));
                await sleep(60000);

            } catch (error) {
                console.error(chalk.red(`[Wallet ${this.walletIndex + 1}] Error:`, error.message));
                consecutiveErrors++;
                
                if (error.response?.status === 401) {
                    console.log(chalk.yellow(`[Wallet ${this.walletIndex + 1}] Auth token expired, will re-login`));
                    this.authToken = null;
                }

                const backoffDelay = Math.min(60000 * Math.pow(2, consecutiveErrors - 1), 300000);
                console.log(chalk.yellow(
                    `[Wallet ${this.walletIndex + 1}] Consecutive errors: ${consecutiveErrors}, ` +
                    `waiting ${Math.floor(backoffDelay/1000)}s before retry...`
                ));

                if (consecutiveErrors >= maxConsecutiveErrors) {
                    console.log(chalk.red(
                        `[Wallet ${this.walletIndex + 1}] Too many consecutive errors, ` +
                        `forcing relogin and extended cooldown...`
                    ));
                    this.authToken = null;
                    consecutiveErrors = 0;
                    await sleep(300000); // 5 minute cooldown
                } else {
                    await sleep(backoffDelay);
                }
            }
        }
    }
}

async function main() {
    try {
        console.clear();
        console.log(chalk.cyan(banner));
        
        const privateKeys = loadPrivateKeys();
        const proxies = loadProxies();
        
        const bots = privateKeys.map((pk, index) => {
            const proxy = proxies.length > 0 ? proxies[index % proxies.length] : null;
            return new ImageComparisonBot(pk, proxy, index);
        });

        await Promise.all(bots.map(bot => bot.runContinuous()));

    } catch (error) {
        console.error(chalk.red('Fatal error:', error));
        process.exit(1);
    }
}

// Error handlers
process.on('uncaughtException', (error) => {
    console.error(chalk.red('Uncaught Exception:', error));
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.red('Unhandled Rejection at:', promise));
    console.error(chalk.red('Reason:', reason));
    process.exit(1);
});

// Run the main function
main().catch(error => {
    console.error(chalk.red('Fatal error in main:', error));
    process.exit(1);
});

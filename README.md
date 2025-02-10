# Singulabs Auto Bot

Multi-wallet automation tool for AI image comparison tasks. This bot supports multiple wallets and proxy configurations for distributed operation.

## 🌟 Features

- Multi-wallet support
- HTTP/SOCKS proxy support
- Automatic image downloading and comparison
- Continuous operation with configurable delays
- Detailed logging with color coding
- Automatic error recovery
- Token expiration handling

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm (Node Package Manager)
- Active wallet with private keys
- (Optional) HTTP/SOCKS proxies

## 🚀 Installation

1. Clone this repository 
```bash
git clone https://github.com/airdropinsiders/Singulabs-Auto-Bot.git
cd Singulabs-Auto-Bot
```
2. Install dependencies:
```bash
npm install
```

## 📁 File Structure

Create the following files in your project directory:

1. `pk.txt` - Private keys (one per line):
```
privatekey1
privatekey2
privatekey3
```

2. (Optional) `proxy.txt` - Proxy list (one per line):
```
http://user:pass@host:port
socks5://user:pass@host:port
```

3. Required project files:
- `index.js` - Main bot code
- `banner.js` - ASCII art banner
- `package.json` - Project configuration
- `README.md` - This documentation

## ⚙️ Configuration

The bot uses several configuration files:

### Private Keys (`pk.txt`)
- One private key per line
- Lines starting with # are ignored
- Remove any whitespace or special characters

### Proxies (`proxy.txt`)
- One proxy per line
- Supports HTTP and SOCKS proxies
- Format: `protocol://user:pass@host:port`
- Lines starting with # are ignored

## 🖥️ Usage

1. Start the bot:
```bash
npm start
```

2. Monitor the console output for:
- Wallet initialization status
- Login attempts
- Point earnings
- Error messages

## 🔄 Operation Cycle

For each wallet, the bot:
1. Initializes connection
2. Logs in and obtains authentication token
3. Downloads random images
4. Uploads original image
5. Performs image comparison
6. Tracks point earnings
7. Waits for configured delay
8. Repeats the cycle

## ⚠️ Error Handling

The bot includes several error handling mechanisms:
- Automatic re-login on token expiration
- Proxy failure recovery
- Network error handling
- File system error management

## 📊 Logging

The bot uses color-coded console output:
- 🟦 Blue: Cycle information
- 🟨 Yellow: Process updates
- 🟩 Green: Success messages
- 🟥 Red: Error messages

## 🔧 Troubleshooting

Common issues and solutions:

1. **Connection Errors**
   - Check internet connection
   - Verify proxy configuration
   - Ensure RPC endpoint is accessible

2. **Authentication Failures**
   - Verify private key format
   - Check wallet balance
   - Ensure correct network configuration

3. **Image Processing Errors**
   - Check disk space
   - Verify file permissions
   - Ensure temporary directory is writable

## 📱 Contact

For support or updates:
- Telegram: [@AirdropInsiderID](https://t.me/AirdropInsiderID)

## ⚖️ License

This project is licensed under the MIT License.

## ⚠️ Disclaimer

This bot is for educational purposes only. Users are responsible for:
- Compliance with terms of service
- Network usage and costs
- Data privacy and security
- Any consequences of usage

---
Made with ❤️ by AirdropInsiderID

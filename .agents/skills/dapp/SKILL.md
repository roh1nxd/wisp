---
name: stellar-dapp-frontend
description: Standard Freighter and Stellar wallet integration guidelines.
---

# Stellar DApp Frontend Integration

When building frontend code for Stellar/Soroban dApps, follow these rules:

1. **Freighter API SDK**: Always include the `@stellar/freighter-api` package in `index.html` via CDN:
   ```html
   <script src="https://cdnjs.cloudflare.com/ajax/libs/stellar-freighter-api/1.1.2/index.min.js"></script>
   ```

2. **Self-Contained Logic**: Do not rely on postMessage or iframe parent window messages. Access Freighter directly via `window.freighterApi`:
   - `window.freighterApi.isConnected()` -> Promise<boolean>
   - `window.freighterApi.getPublicKey()` -> Promise<string>
   - `window.freighterApi.signTransaction(xdr, { network })` -> Promise<{ signedTxXdr, signerAddress, error }>
   - `window.freighterApi.signBlob(hex)` -> Promise<string>

3. **Plain JS Usage**: In your JavaScript (`app.js`), implement connection like this:
   ```javascript
   const connectWalletBtn = document.getElementById("connect-wallet-btn");
   const walletAddressEl = document.getElementById("wallet-address");

   connectWalletBtn.addEventListener("click", async () => {
     try {
       if (!window.freighterApi) {
         alert("Freighter API SDK not loaded. Make sure the script is included.");
         return;
       }
       
       const connected = await window.freighterApi.isConnected();
       if (!connected) {
         alert("Please install or unlock the Freighter wallet extension.");
         return;
       }

       const publicKey = await window.freighterApi.getPublicKey();
       if (publicKey) {
         walletAddressEl.textContent = publicKey;
         walletAddressEl.classList.remove("hidden");
         console.log("Connected successfully to Freighter:", publicKey);
       }
     } catch (err) {
       console.error("Wallet connection failed:", err);
       alert("Failed to connect wallet: " + err.message);
     }
   });
   ```

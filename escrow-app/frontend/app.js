// Self-contained Freighter wallet connect & transaction signing logic
const connectBtn = document.getElementById("connect-wallet-btn");
const releaseBtn = document.getElementById("release-funds-btn");
const connectionBadge = document.getElementById("connection-badge");
const walletInfo = document.getElementById("wallet-info");
const walletAddress = document.getElementById("wallet-address");

let userPublicKey = null;

// Connect Wallet handler
connectBtn.addEventListener("click", async () => {
  try {
    // 1. Confirm Freighter is installed and available
    if (typeof window === "undefined" || !window.freighterApi) {
      alert("Freighter API SDK not detected. Please verify the CDN script is loaded.");
      return;
    }

    const isInstalled = await window.freighterApi.isConnected();
    if (!isInstalled) {
      alert("Freighter wallet is not installed or active in your browser. Install the extension first.");
      return;
    }

    // 2. Request the active public key from the extension
    const publicKey = await window.freighterApi.getPublicKey();
    if (publicKey) {
      userPublicKey = publicKey;
      
      // Update UI elements
      connectionBadge.textContent = "Connected";
      connectionBadge.className = "px-2 py-0.5 rounded text-[10px] font-semibold bg-green-500/10 border border-green-500/20 text-green-400";
      
      walletAddress.textContent = publicKey;
      walletInfo.classList.remove("hidden");
      
      connectBtn.textContent = "Connected to Freighter";
      connectBtn.disabled = true;
      connectBtn.classList.replace("bg-violet-600", "bg-slate-800");

      // Enable the release button
      releaseBtn.removeAttribute("disabled");
      
      console.log("Freighter wallet linked successfully. Account:", publicKey);
    }
  } catch (err) {
    console.error("Wallet connection failed:", err);
    alert("Connection failed: " + err.message);
  }
});

// Release Funds handler
releaseBtn.addEventListener("click", async () => {
  if (!userPublicKey) return;

  try {
    alert("Initiating release transaction. Look for a Freighter popup to approve.");

    // Sample Transaction XDR for a Soroban Contract invocation (release method)
    const mockTxXdr = "AAAAAgAAAAB6o..." // Base64 XDR stub
    
    // Request cryptographic signature from Freighter extension
    const signedResult = await window.freighterApi.signTransaction(mockTxXdr, {
      network: "TESTNET"
    });

    if (signedResult && !signedResult.error) {
      alert("Success! Transaction signed by " + userPublicKey + "\n\nReady to submit XDR to Soroban RPC.");
      console.log("Signed transaction XDR:", signedResult);
    } else if (signedResult && signedResult.error) {
      throw new Error(signedResult.error);
    }
  } catch (err) {
    console.error("Signing failed:", err);
    alert("Transaction signing rejected or failed: " + err.message);
  }
});

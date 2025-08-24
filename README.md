# 🎨 NFT Forge - AI-Powered Shape Network NFT Generator

**🚀 Live Application:** [https://nftf-forge.vercel.app/](https://nftf-forge.vercel.app/)  
**🎥 Demo Video:** [https://www.youtube.com/watch?v=UjwuT54AJuw](https://www.youtube.com/watch?v=UjwuT54AJuw)  
**🎨 NftForge Contract:** [https://sepolia.shapescan.xyz/address/0x158d4964Fa28f9E72CCCcB9a6cD6699f2982Be01](https://sepolia.shapescan.xyz/address/0x158d4964Fa28f9E72CCCcB9a6cD6699f2982Be01)  
**💳 ForgePayment Contract:** `0x0F8B14c7a8f9Ac940C75fd764Fa7Fd61c1dB60C4`  
**🤖 AI Wallet Address:** `0x473fa0F100981fffFf40dB48B29B97AF9A44Dbbc`

**Deployed on Shape Sepolia Testnet**

---

## 🌟 Welcome to Shape NFT Forge

NFT Forge revolutionizes digital art creation by combining the power of **AI-generated imagery** with **blockchain technology** on the **Shape Network**. This isn't just another NFT platform—it's an intelligent creative companion that creates unique, personalized digital masterpieces.

### 🎯 What Makes NFT Forge Special?

NFT Forge puts the creative power in your hands while leveraging cutting-edge AI technology. Choose your artistic vision and watch as our intelligent system brings it to life:

- 🎨 **Choose Your Artistic Theme** - Select from Shape Network geometrics, cosmic abstracts, cyberpunk cities, digital nature, and more
- ⚡ **Pick Your Rarity Level** - From clean common designs to legendary masterpieces with complex visual effects
- 🧠 **AI-Powered Generation** - Advanced DALL-E 3 integration creates unique, high-quality artwork based on your selections
- 🔗 **Seamless Blockchain Integration** - Direct minting to Shape Network with intelligent payment processing
- � **True Uniqueness** - Each generation produces completely unique artwork, even with the same theme and rarity selections

---

## 🖼️ Gallery of AI-Generated Masterpieces

Here are some stunning examples of NFTs minted with NFT Forge, showcasing the diverse range of artistic styles and themes:

### Shape Network Geometric Collection
<div align="center">

![Shape Network Art 1](./images/shape1.png)
*Holographic Pentagon - Deep teals and electric blues with geometric crystalline aesthetics*

![Shape Network Art 2](./images/shape2.png)  
*Cosmic Digital Hexagon - Vaporwave aesthetic with constellation patterns*

![Shape Network Art 3](./images/shape3.png)
*Glitch Art Triangle - Modern digital illustration with high contrast and depth*

![Shape Network Art 4](./images/shape4.png)
*Abstract Digital Prism - Stellar whites and nebula purples in perfect harmony*

![Shape Network Art 5](./images/shape5.png)
*Low-Poly Cosmic Form - Geometric precision meets organic flow*

![Shape Network Art 6](./images/shape6.png)
*Crystalline Structure - Iridescent whites with dramatic lighting effects*

</div>

---

## 🚀 How It Works - The Magic Behind the Scenes

### 1. 🔗 **Connect Your Wallet**
Simply connect your Web3 wallet to Shape Network.

### 2. 🎨 **Choose Your Theme & Rarity**  
You have full creative control! Select from five distinct artistic themes:
- **Shape Network**: Geometric crystalline forms with deep teals and electric blues
- **Cosmic Digital**: Stellar abstracts with cosmic nebula colors  
- **Cyberpunk City**: Neon-urban landscapes with digital rain
- **Digital Nature**: Organic-tech fusion with fractal trees and flowers
- **Abstract Digital**: Fluid-dynamic compositions with digital waves

Then pick your desired rarity level for visual complexity.

### 3. ⚡ **Choose Your Rarity**
- **Common**: Clean, elegant designs
- **Rare**: Enhanced lighting and special effects  
- **Epic**: Additional atmospheric effects and refined details
- **Legendary**: Maximum visual complexity with particle effects and multiple light sources

### 4. 💳 **Seamless Payment**
Pay 0.01 ETH through our integrated payment system. Credits are instantly available for minting.

### 5. 🎯 **AI Generation & Minting**
Watch as our AI creates your personalized masterpiece and automatically mints it to your wallet on Shape Sepolia Network.

---

## 🏗️ Technical Architecture

### Smart Contracts (Solidity)
- **NftForge.sol**: Main NFT contract ("AI Forged NFT", "AIFNFT") with ERC-721 implementation
  - Access control with MINTER_ROLE for AI wallet

- **ForgePayment.sol**: Payment processing and credit management (0.01 ETH per mint)
  - Automatic refunds for overpayments
  - 40% revenue allocation to AI operations wallet
  - Credit-based system preventing double-spending
- Deployed on **Shape Sepolia Testnet** with full verification

### Frontend (Next.js 15)
- **Started from** Shape builder-kit
- **React 18** with TypeScript
- **Wagmi v2** for Web3 integration and wallet connections
- **TailwindCSS** with custom theming for modern UI
- **Viem** for efficient blockchain interactions

### AI Integration
- **OpenAI DALL-E 3** for high-quality image generation
- **GPT-4o-mini AI Assistants** for intelligent workflow automation
- **Pinata IPFS** for decentralized metadata storage

### Key Features
- ✅ **Intelligent Fallback Systems**: Robust handling of RPC failures and caching issues
- ✅ **Real-time State Synchronization**: Immediate UI updates after transactions
- ✅ **Standardized AI Responses**: Reliable parsing and error handling
- ✅ **Production-Ready Architecture**: Full error handling and edge case management

---

## 🛠️ Technical Innovation Highlights

### 🔄 **Robust Fallback Systems**
NFT Forge implements sophisticated fallback mechanisms that ensure reliability even when blockchain RPC providers are unstable:

```typescript
// Dual-layer detection for wagmi failures with automatic API substitution
useEffect(() => {
  if (address && !useApiFallback) {
    const shouldTriggerFallback = 
      canMint === undefined || // wagmi completely broken
      (apiCredits !== null && apiCanMint !== null && apiCanMint !== canMint);
    
    if (shouldTriggerFallback) {
      console.log('🚨 Emergency API fallback triggered');
      setUseApiFallback(true);
    }
  }
}, [canMint, useApiFallback, address, apiCredits, apiCanMint]);
```

### 🎨 **Personalized Shape Selection**
The platform uses your wallet address to add uniqueness to the generation process:

```typescript
// Wallet address influences shape selection and color variations
const walletHash = hashCode(walletAddress);
const randomShape = shapes[Math.floor(Math.random() * shapes.length)];
const uniqueColorIndex = Math.abs(walletHash) % themeConfig.colors.length;
const uniqueElementIndex = Math.abs(walletHash >> 8) % themeConfig.elements.length;
```

### ⚡ **Automated Post-Mint Refresh**
Immediate UI updates after successful minting without manual page refreshes:

```typescript
// After successful mint, refresh credit data to show consumption
if (targetAddress && isAddress(targetAddress)) {
  console.log('Mint successful, refreshing credit data...');
  refetchCanMint();
  refetchPaidTokenCount();
  
  // API consistency check with automatic fallback activation
  setTimeout(async () => {
    const response = await fetch(`/api/check-user-credits?address=${targetAddress}&t=${Date.now()}`);
    const apiData = await response.json();
    
    if (apiData.canMint !== canMint) {
      console.log('Post-mint: wagmi/API mismatch, using API fallback');
      setUseApiFallback(true);
    }
  }, 1000);
}
```

---

## 🏆 Why NFT Forge Stands Out for Shapecraft2

### 🎯 **Perfect Shape Network Integration**
- Native deployment on Shape Network with optimized gas usage
- Themed artwork specifically designed for Shape's aesthetic
- Seamless wallet integration with Shape's ecosystem

### 🚀 **Production-Ready Quality**
- Comprehensive error handling and edge case management
- Real-time state synchronization without manual refreshes
- Robust fallback systems for blockchain connectivity issues
- Professional UI/UX with modern design principles

### 🧠 **AI-First Approach**
- User-controlled theme and rarity selection for personalized art
- Advanced DALL-E 3 integration with sophisticated prompt engineering
- GPT-4o-mini assistants for intelligent workflow automation
- Wallet-influenced shape and color variations for uniqueness
- Advanced prompt engineering for optimal results

### 💡 **Innovation in User Experience**
- Zero-friction minting process from payment to NFT delivery
- Intelligent credit management with automatic state updates
- Multiple rarity tiers with increasing visual complexity
- Transparent transaction tracking and status updates

---

## 📊 Smart Contract Addresses

### Shape Sepolia Testnet
- **NftForge**: `0x158d4964fa28f9e72ccccb9a6cd6699f2982be01`
- **ForgePayment**: `0x0F8B14c7a8f9Ac940C75fd764Fa7Fd61c1db60c4`

All contracts are verified on Shape Explorer

---


## 🔮 Future Roadmap

- 🚀 **Resolve bugs in the application** Although I am happy with the progress of the application there is plenty of room for improvement
- 🌟 **Enhanced User Experience**: Add features to allow users to have more choice in selection shapes.
- 🎨 **Advanced AI Models**: Integration with latest generative AI technologies
- 👥 **Social Features**: Community galleries and artist collaborations
- 📱 **Mobile App**: Native iOS and Android applications
- 🏪 **Marketplace**: Secondary trading with royalty mechanisms

---


<div align="center">

**Made with ❤️ for the Shape Network community**

[Live App](https://nftf-forge.vercel.app/) • [Demo Video](https://www.youtube.com/watch?v=UjwuT54AJuw) • [GitHub](https://github.com/leetebbs/nftf-forge)

</div>

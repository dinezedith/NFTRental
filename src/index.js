import { ethers } from 'ethers';
import tokenDetails, { escrowAddress, transferProxy } from './token';

var provider;
var chainId;
var accounts;
var signer;


async function Disconnect() {
  userAddress = '';
  provider = "";
  signer = "";
  document.getElementById('Account').innerHTML = userAddress;
  alert("Disconnected")
}


async function connection() {
  //try {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    debugger
    signer = provider.getSigner();
    accounts = await signer.getAddress();
    console.log("Account:", await signer.getAddress());
    let bal = await balance();
    chainId = await signer.getChainId();
    var Networkname = await provider.getNetwork();
    document.getElementById('Account').innerHTML = accounts;
    document.getElementById('Balance').innerHTML = bal;
    document.getElementById('chainId').innerHTML = chainId
    document.getElementById('network').innerHTML = Networkname.name;
    console.log(`User's address is ${accounts}`)

  // } catch (e) {
  //   console.log(e);
  // }
}

async function getaccounts() {
  try {
    signer = provider.getSigner();
    accounts = await signer.getAddress();
    return accounts;
  } catch (e) {
    console.log(e)
  }
}

async function balance() {
  var bal = await signer.getBalance()
  console.log((bal)/10**18)
  var walletBalance = (bal)/10**18
  document.getElementById('Balance').innerHTML = walletBalance; 
  return walletBalance;
}

async function splitSign(hash) {
  var signature = ethers.utils.splitSignature(hash);
  return signature;
}

async function signMessage(contract721, accounts, tokenURI, nonce) {
  var hash;
  hash = ethers.utils.solidityKeccak256(["address", "address", "string", "uint256"],[contract721, accounts, tokenURI, nonce])
  var msgHash = ethers.utils.arrayify(hash)
  return msgHash
}

async function generateId(account, tokenId, quantity, nftAddress, keyAddress) {
  return ethers.utils.solidityKeccak256(["address", "uint256", "uint256", "address", "address"],[account, tokenId, quantity, nftAddress, keyAddress]);
}

async function rentalSignMessage(escrowAddress, account, id, nonce) {
  var hash = ethers.utils.solidityKeccak256(["address", "address", "bytes32", "uint256"],[escrowAddress, account, id, nonce]);
  return ethers.utils.arrayify(hash);
}

async function getContract(contractAddress, abi) {
  var contract = new ethers.Contract(contractAddress, abi, provider);
  var tokenContract = contract.connect(signer); 
  return tokenContract;
}

async function mint721() {
  let tokenURI = document.getElementById("uri").value;
  let fees = document.getElementById("rFee").value;
  var nonce = Math.floor(new Date().getTime() / 1000);
  let msgHash = await signMessage(tokenDetails.tradeContract, tokenDetails.contract721Address, accounts, tokenURI, nonce, false);
  let wallet = new ethers.Wallet(tokenDetails.privateKey, provider)
  var hash = await wallet.signMessage(msgHash);
  var sign = await splitSign(hash)
  var contract721 = await getContract(tokenDetails.contract721Address, tokenDetails.abi721);
  var tx = await contract721.mint(tokenURI, [fees], [accounts],[sign.v, sign.r, sign.s, nonce]);

  var receipt = await tx.wait();
  var tokenID =  parseInt(receipt.events[0].topics[3])
  alert("tokenId" + ':'+ tokenID)
}

async function mint1155() {
  let tokenURI = document.getElementById("uri").value;
  let fees = document.getElementById("rFee").value;
  let supply = document.getElementById("supply").value;
  let nonce = Math.floor(new Date().getTime() / 1000);
  let msgHash = await signMessage(tokenDetails.tradeContract, tokenDetails.contract1155Address, accounts, tokenURI, nonce, false);
  let wallet = new ethers.Wallet(tokenDetails.privateKey, provider)
  var hash = await wallet.signMessage(msgHash);
  var sign = await splitSign(hash)
  var contract1155 = await getContract(tokenDetails.contract1155Address, tokenDetails.abi1155);
  var tx = await contract1155.mint(tokenURI, supply, [fees], [accounts], [sign.v, sign.r, sign.s, nonce],
    {
      gasPrice: ethers.utils.parseUnits("100", "gwei"), 
      gasLimit: 500000
    });
  var receipt = await tx.wait();
  var tokenID = parseInt((receipt.events[0].data).slice(0,66))
  alert("tokenId" + ':'+ tokenID)
}

async function approveNFT() {
  let type = document.getElementById("nftType").value;
  var contract;
  if(type == 0) {
    contract = await getContract(tokenDetails.contract1155Address, tokenDetails.abi1155);;
  } else {
    contract = await getContract(tokenDetails.contract721Address, tokenDetails.abi721);;
  }
  var tokenContract = contract.connect(signer); 
  var tx = await tokenContract.setApprovalForAll(tokenDetails.transferProxy, true);
  var receipt = await tx.wait()

}

async function signSellOrder() {
  let type = document.getElementById("assetType").value;
  let tokenId = document.getElementById("tokenId").value;
  let unitPrice  = document.getElementById("nftPrice").value;
  unitPrice = (unitPrice * 10 ** 18).toString();
  var nftAddress;

  if(type == 0) {
    nftAddress = tokenDetails.contract1155Address
  } else if(type == 1) {
    nftAddress = tokenDetails.contract721Address
  } else if(type == 2) {
    nftAddress = tokenDetails.lazyMinterc1155
  } else {
    nftAddress = tokenDetails.lazyMinterc721
  }

  let nonce = Math.floor(new Date().getTime() / 1000);
  console.log([nftAddress, tokenId, tokenDetails.erc20PaymentAddress, unitPrice, nonce])
  var hash = ethers.utils.solidityKeccak256(["address", "uint256", "address", "uint256", "uint256"],[nftAddress, tokenId, tokenDetails.erc20PaymentAddress, unitPrice, nonce])
  var msgHash = ethers.utils.arrayify(hash)
  var signHash = await signer.signMessage(msgHash);
  var sign = await splitSign(signHash)
  console.log(sign.v ,sign.r ,sign.s ,nonce)
  alert("V"+ ':'+ sign.v + ','+ "\nR" + ':'+ sign.r + ','+ "\nS" + ':'+ sign.s + ','+ "\nNonce", + ':'+ nonce)
}


async function bidSign() {
  let type = document.getElementById("assetType").value;
  let tokenId = document.getElementById("tokenId").value;
  let unitPrice  = document.getElementById("nftPrice").value
  let qty  = document.getElementById("quantity").value
  unitPrice = unitPrice * 10 ** 18;
  var nftAddress;
  let amount = (unitPrice + (unitPrice * 2.5 / 100)).toString()
  let proxy;

  if(type == 0) {
    nftAddress = tokenDetails.contract1155Address
    proxy = tokenDetails.transferProxy
  } else if(type == 1) {
    nftAddress = tokenDetails.contract721Address
    proxy = tokenDetails.transferProxy

  } else if(type == 2) {
    nftAddress = tokenDetails.lazyMinterc1155
    proxy = tokenDetails.lazyMintTransferProxy

  } else {
    nftAddress = tokenDetails.lazyMinterc721
    proxy = tokenDetails.lazyMintTransferProxy

  }

  await deposit(amount)
  await approveERC20(proxy,amount)


  let nonce = Math.floor(new Date().getTime() / 1000);

  console.log(nftAddress, tokenId, tokenDetails.erc20PaymentAddress, amount, qty, nonce)
  var hash = ethers.utils.solidityKeccak256(["address", "uint256", "address", "uint256", "uint256", "uint256"],[nftAddress, tokenId, tokenDetails.erc20PaymentAddress, amount, qty, nonce])
  var msgHash = ethers.utils.arrayify(hash)
  var signHash = await signer.signMessage(msgHash);
  var sign = await splitSign(signHash)
  console.log(sign.v ,sign.r ,sign.s ,nonce)

}


async function deposit(amount) {
  var contract = await getContract(tokenDetails.erc20PaymentAddress, tokenDetails.weth);
  var tx = await contract.deposit({value: amount})
  await tx.wait()
}

async function approveERC20(contractAddress, amount) {
  var contract = await getContract(tokenDetails.erc20PaymentAddress, tokenDetails.weth);
  var tx = await contract.approve(contractAddress, amount)
  await tx.wait()

}

async function buyAsset() {

  var sign;
  let type = document.getElementById("buynftType").value;
  let tokenID = document.getElementById("buytokenId").value;
  let unitPrice  = document.getElementById("buynftPrice").value;
  sign = JSON.parse(document.getElementById("buysignValue").value);
  console.log(sign)
  let assetOwner = document.getElementById("buysellerAddress").value;
  let qty = document.getElementById("buyquantity").value;

  unitPrice = (unitPrice * 10 ** 18).toString();
  let amount = (Number(unitPrice) + Number(unitPrice * 2.5 / 100)).toString();
  let nftAddress;
  let abi;

  await deposit(amount)
  await approveERC20(tokenDetails.transferProxy ,amount)

  if(type == 0) 
  {
    nftAddress = tokenDetails.contract1155Address
    abi = tokenDetails.abi1155
  } else {
    nftAddress = tokenDetails.contract721Address
    abi = tokenDetails.abi721
  }

  var orderStruct = [
    assetOwner, 
    accounts,
    tokenDetails.erc20PaymentAddress,
    nftAddress,
    type,
    unitPrice,
    amount,
    tokenID,
    qty
  ]

  var tokenContract = await getContract(tokenDetails.trade ,tokenDetails.abiTrade);
  var contract = tokenContract.connect(signer); 
  var tx = await contract.buyAsset(orderStruct, sign);
  var receipt = await tx.wait();
  console.log(receipt)

}

async function executeBid() {

  let type = document.getElementById("bidnftType").value;
  let tokenID = document.getElementById("bidtokenId").value;
  let unitPrice  = document.getElementById("bidnftPrice").value;
  let sign = JSON.parse(document.getElementById("bidsignValue").value);
  let buyerAddress = document.getElementById("bidbuyerAddress").value;
  let qty = document.getElementById("bidquantity").value;

  unitPrice = (unitPrice * 10 ** 18).toString();
  let amount = (Number(unitPrice) + Number(unitPrice * 2.5 / 100)).toString();
  let nftAddress;
  let abi;

  if(type == 0) 
  {
    nftAddress = tokenDetails.contract1155Address
    abi = tokenDetails.abi1155
  } else {
    nftAddress = tokenDetails.contract721Address
    abi = tokenDetails.abi721
  }
  var orderStruct = [
    accounts, 
    buyerAddress,
    tokenDetails.erc20PaymentAddress,
    nftAddress,
    type,
    unitPrice,
    amount,
    tokenID,
    qty
  ]


var tokenContract = await getContract(tokenDetails.trade ,tokenDetails.abiTrade);
var contract = tokenContract.connect(signer); 
var tx = await contract.executeBid(orderStruct, sign);
var receipt = await tx.wait();
console.log(receipt)

}

//account, tokenId, quantity, nftAddress, keyAddress
async function lend() {
  console.log("lend");
    var lendData = [
                      document.getElementById("lendId").value,
                      accounts,
                      document.getElementById("nftAddress").value,
                      document.getElementById("tokenId").value,
                      document.getElementById("maxduration").value,
                      document.getElementById("dailyRent").value,
                      document.getElementById("lendingQuantity").value,
                      document.getElementById("paymentAddress").value,
                      document.getElementById("lendTime").value
                    ]
    let nonce = Math.floor(new Date().getTime() / 1000);                    
    var Msg = await rentalSignMessage(tokenDetails.escrowAddress, accounts, await generateId(accounts, document.getElementById("tokenId").value, document.getElementById("lendingQuantity").value, document.getElementById("nftAddress").value, document.getElementById("paymentAddress").value), nonce)                 
    let wallet = new ethers.Wallet(tokenDetails.privateKey, provider);
    var hash = await wallet.signMessage(Msg);
    var sign = await splitSign(hash)
    var contract = await getContract(tokenDetails.escrowAddress, tokenDetails.escrowABI);
    var tx = await contract.lend(lendData, [sign.v, sign.r, sign.s, nonce],{
        gasPrice: ethers.utils.parseUnits("100", "gwei"), 
        gasLimit: 500000
    });
    var receipt = await tx.wait();
    var Id = receipt.events[2].args['id'];
    alert("please copy this" +" lend ID: "+ Id);
    console.log("lend Id :", Id)
  }

async function rent() {

  var contract = await getContract(tokenDetails.escrowAddress, tokenDetails.escrowABI);
  var result = await contract.getLendDetails(document.getElementById("lendID").value);
  debugger
  var amount = ((parseInt(result[0].dailyRent) * document.getElementById("quantity").value * document.getElementById("duration").value)) * 10 ** 18;
  await deposit(amount.toString());
  await approveERC20(tokenDetails.transferProxy, amount.toString());
  let nonce = Math.floor(new Date().getTime() / 1000);                    
  var Msg = await rentalSignMessage(tokenDetails.escrowAddress, accounts, await generateId(accounts, parseInt(result[0].tokenId), document.getElementById("quantity").value, result[0].nftAddress, result[0].lender), nonce)                 
  let wallet = new ethers.Wallet(tokenDetails.privateKey, provider)
  var hash = await wallet.signMessage(Msg);
  var sign = await splitSign(hash)
  var contract = await getContract(tokenDetails.escrowAddress, tokenDetails.escrowABI);
  var tx = await contract.rent(
                    document.getElementById("lendID").value,
                    document.getElementById("quantity").value,
                    document.getElementById("duration").value,
                    [sign.v, sign.r, sign.s, nonce],
                    {
                      gasPrice: ethers.utils.parseUnits("100", "gwei"), 
                      gasLimit: 500000}    
                  );
  var receipt = await tx. wait();
  console.log("rentalId", receipt.events[0].topics[0]);
  var Id = receipt.events[1].args['id'];
  alert("please copy this rental Id:", " ",+ receipt.events[0].topics[0]);
} 


async function claim() {
  let nonce = Math.floor(new Date().getTime() / 1000);                    
  var Msg = await rentalSignMessage(tokenDetails.escrowAddress, accounts, document.getElementById("rentalId").value, nonce)                 
  let wallet = new ethers.Wallet(tokenDetails.privateKey, provider)
  var hash = await wallet.signMessage(Msg);
  var sign = await splitSign(hash)
  var contract = await getContract(tokenDetails.escrowAddress, tokenDetails.escrowABI);
  var tx = await contract.
                        claim(
                          document.getElementById("rentalId").value,
                          [sign.v, sign.r, sign.s, nonce] 
                        );
  var receipt = tx.wait();                     
}

async function regain() {
  let nonce = Math.floor(new Date().getTime() / 1000);                    
  var Msg = await rentalSignMessage(tokenDetails.escrowAddress, accounts, document.getElementById("lendIDs").value, nonce)                 
  let wallet = new ethers.Wallet(tokenDetails.privateKey, provider);
  var hash = await wallet.signMessage(Msg);
  var sign = await splitSign(hash)
  var contract = await getContract(tokenDetails.escrowAddress, tokenDetails.escrowABI);
  var tx = await contract.
                        regain(
                          document.getElementById("lendIDs").value,
                          [sign.v, sign.r, sign.s, nonce],
                          {
                            gasPrice: ethers.utils.parseUnits("100", "gwei"), 
                            gasLimit: 500000
                          } 
                        );
  var receipt = tx.wait(); 
}

async function getLendDetails() {

  var contract = await getContract(tokenDetails.escrowAddress, tokenDetails.escrowABI);
  var tx = await contract.
                    getLendDetails(
                      document.getElementById("rent/LendId").value
                    );
  debugger                  
  document.getElementById('lendId-read').innerHTML = tx[0].lendId;
  document.getElementById('lender-read').innerHTML = tx[0].lender;
  document.getElementById('tokenAddress-read').innerHTML = tx[0].nftAddress;
  document.getElementById('tokenId-read').innerHTML = parseInt(tx[0].tokenId);
  document.getElementById('maxDuration-read').innerHTML = parseInt(tx[0].maxduration);
  document.getElementById('dailyrent').innerHTML = parseInt(tx[0].dailyRent);
  document.getElementById('lendedQty').innerHTML = parseInt(tx[0].lendingQuantity);
  document.getElementById('paymentAddress-read').innerHTML = tx[0].paymentAddress;
  document.getElementById('lendedTime').innerHTML = parseInt(tx[0].lendTime);
  document.getElementById('isValid').innerHTML = tx[1];
}


async function getrentDetails() {

  var contract = await getContract(tokenDetails.escrowAddress, tokenDetails.escrowABI);
  var tx = await contract.
                    getrentDetails(
                      document.getElementById("rent/LendId").value
                    );
  document.getElementById('lendId-read').innerHTML = document.getElementById("rent/LendId").value;
  document.getElementById('lender-read').innerHTML = tx[0].lender;;
  document.getElementById('renter-read').innerHTML = tx[0].renter;
  document.getElementById('tokenAddress-read').innerHTML = tx[0].nftAddress;
  document.getElementById('tokenId-read').innerHTML = parseInt(tx[0].tokenId);
  document.getElementById('maxDuration-read').innerHTML = parseInt(tx[0].duration);
  document.getElementById('lendedQty').innerHTML = parseInt(tx[0].rentedQuantity);;
  document.getElementById('lendedTime').innerHTML = parseInt(tx[0].rentedTime);
  document.getElementById('isValid').innerHTML = tx[1];
}


function getRandom(address) {
  let value = Date.now() + Math.floor((Math.random() * (10 ** 10)) + 1);
  var hex = value.toString(16);
  hex = hex + address.slice(2);
  return `0x${'0'.repeat(64-hex.length)}${hex}`;
}

async function deploy() {
  let type = document.getElementById("ownNftType").value;
  let name = document.getElementById("ownNftName").value;
  let symbol = document.getElementById("ownNftSymbol").value;
  let tokenURI = tokenDetails.uri
  let factoryContract;
  var abi; 

  var salt = getRandom(accounts);


  if(type == 0) {
    factoryContract = tokenDetails.factory1155;
    abi = tokenDetails.factory1155abi;
  } else {
    factoryContract = tokenDetails.factory721;
    abi = tokenDetails.factory721abi;
  }

  var tokenContract = await getContract(factoryContract, abi);
  var tx = await tokenContract.deploy(salt, name, symbol, tokenURI);
  var receipt = await tx.wait();
  console.log("contractAddress",receipt.events[4].args["contractAddress"])

}

async function connectWallet() {
    document.getElementById('connectButton').onclick = connection
    document.getElementById('disConnectButton').onclick = Disconnect
    document.getElementById('Account').onclick = getaccounts
    document.getElementById('Balance').onclick = balance
    document.getElementById('mint721').onclick = mint721
    document.getElementById('mint1155').onclick = mint1155
    document.getElementById('approveNft').onclick = approveNFT
    document.getElementById('signseller').onclick = signSellOrder
    document.getElementById('signbid').onclick = bidSign
    document.getElementById('buy').onclick = buyAsset
    document.getElementById('bid').onclick = executeBid
    document.getElementById('deploy').onclick = deploy
    document.getElementById('lend').onclick = lend
    document.getElementById('rent').onclick = rent
    document.getElementById('claim').onclick = claim
    document.getElementById('regain').onclick = regain
    document.getElementById('getLendDetails').onclick = getLendDetails;
    document.getElementById('getrentDetails').onclick = getrentDetails;

}

connectWallet();
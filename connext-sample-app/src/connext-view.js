import React, { Component }  from 'react'
import * as connext from "@connext/client"
import { CF_PATH, ConnextClientStorePrefix } from "@connext/types";
import { ConnextStore, PisaClientBackupAPI } from "@connext/store";
import { Button, CircularProgress, Grid, InputAdornment, Modal, TextField, Tooltip, Typography, withStyles, } from "@material-ui/core"
import { toBN, inverse, minBN, tokenToWei, weiToToken } from './utils/bn'
import { Currency }  from './utils/currency'
import { Contract, ethers as eth } from "ethers"

import { AddressZero, Zero } from "ethers/constants";
import { formatEther, parseEther } from "ethers/utils"
//import { hexlify, randomBytes } from "ethers/utils";
//import { ConnextEvents } from "@connext/types";

// backup service
import { PisaClient } from "pisa-client";

import { paymentHandler } from "./util/sender"
import { cashoutEther, cashoutTokens} from "./util/cashout"

// TODO: ged rid off if possible
import interval from "interval-promise"; // TODO: don not install and replace to setInterval
import { rootMachine } from "./state/root";
import { interpret } from "xstate";
import { cleanWalletConnect,initWalletConnect } from "./utils/clientWalletConnectMapping";
import { fromExtendedKey, fromMnemonic } from "ethers/utils/hdnode";

// TODO: recheck why we need this
// TODO: avoid autoswap
import tokenArtifacts from "openzeppelin-solidity/build/contracts/ERC20Mintable.json";

const styles = theme => ({
	icon: {
		width: "40px",
		height: "40px"
	},
	base: {
		textAign: 'left',
		fontSize: '12px'
	},
	button: {
		paggingTop: '20px',
		backgroundColor: "#FCA311",
		color: "#FFF"
	},
	modal: {
		position: "absolute",
		top: "-400px",
		left: "150px",
		width: theme.spacing(50),
		backgroundColor: theme.palette.background.paper,
		boxShadow: theme.shadows[5],
		padding: theme.spacing(4),
		outline: "none"
	}
});

// LogLevel for testing ChannelProvider
const LOG_LEVEL = 5; //3;

const overrides = {
	nodeUrl: 'wss://rinkeby.indra.connext.network/api/messaging',
	ethUrl: 'https://rinkeby.indra.connext.network/api/ethprovider',
};

const urls = {
  ethProviderUrl:
    overrides.ethUrl || `${window.location.origin}/api/ethprovider`,
  nodeUrl:
    overrides.nodeUrl ||
    `${window.location.origin.replace(/^http/, "ws")}/api/messaging`,
  legacyUrl: chainId =>
    chainId.toString() === "1"
      ? "https://hub.connext.network/api/hub"
      : chainId.toString() === "4"
      ? "https://rinkeby.hub.connext.network/api/hub"
      : undefined,
  pisaUrl: chainId =>
    chainId.toString() === "1"
      ? "https://connext.pisa.watch"
      : chainId.toString() === "4"
      ? "https://connext-rinkeby.pisa.watch"
      : undefined,
};

const ethProvider = new eth.providers.JsonRpcProvider(urls.ethProviderUrl);

// Constants for channel max/min - this is also enforced on the hub
const WITHDRAW_ESTIMATED_GAS = toBN("300000");
const DEPOSIT_ESTIMATED_GAS = toBN("25000");
const MAX_CHANNEL_VALUE = Currency.DAI("30");

const split = (balance) => {
	const bal = balance.format({ decimals: 3, symbol: false });
	const whole = bal.substring(0, bal.indexOf('.'));
	const part = bal.substring(bal.indexOf('.'));
	return { whole, part: part.substring(0,4) };
}

//User1
const xpubUser1 = "xpub6F9PFkzoyNJ68Je5LpGmamaecvnBaagbyxbYwT8LnDabFXhRL4T3LdJXmKDpbMj9pCn7ojtWdKLPyFGHsNxtZonDMZBBKJeLbCZqjta6BJh"

//User2 PORT 3333
//FF:
const xpubUser2="xpub6FEJYdkRnJdDcqjLXxZyqswNXPCFz9Qa1UNVTumEAyX3kM6XnW2rxv2nSAwazVLyUBmPuBp43mUnwfH1bmGmgswvn36iw8sWfquaVEVzDFk"

//Safari
//const xpubUser2 ="xpub6EPbieML9jjSdMFFtJVACZHezv8f5SZeyWm1gne6TXwWpqKBKRvQ89AWsUKsqy9xdMrA59pK26i2Gk6Uh6wuXjZCJUTZfm3vGNkKeBLnQro"

// dai example
//const xpubUser2 = "xpub6ErQntFmhG2DRw2FBsYfPuKVrsJRdw8opUk44E2aKznSnypjTSrNzA2TbAb2j6eEV4UHNDYF9HvgGhDXAMWhnR77q1KccjJrJaKmMCcahtu"

class ConnextView extends Component {

	constructor(props) {
		super(props);
		const swapRate = "100.00";
		const machine = interpret(rootMachine); //TODO: try not to use

		console.log("ENV: ", process.env.REACT_APP_ETH_URL_OVERRIDE)
		console.log("URLs:", urls)

		console.log("PORT:", window.location.port)

		this.state = {
			balance: {
			channel: {
				ether: Currency.ETH("0", swapRate),
				token: Currency.DAI("0", swapRate),
				total: Currency.ETH("0", swapRate),
			},
			onChain: {
				ether: Currency.ETH("0", swapRate),
				token: Currency.DAI("0", swapRate),
				total: Currency.ETH("0", swapRate),
			},
			},
			ethProvider: new eth.providers.JsonRpcProvider(urls.ethProviderUrl),
			channel: null,
			machine,
			maxDeposit: null,
			minDeposit: null,
			network: {},
			useWalletConnext: false,
			saiBalance: Currency.DAI("0", swapRate),
			state: machine.initialState, //TODO: use own states
			swapRate,
			token: null,
			send: {
				recipient: {
					value: window.location.port == 3333 ? xpubUser1 : xpubUser2,
					error: null,
				},
				amount: {
					display: "",
					error: null,
					value: Currency.DAI(1),
				}
			},

			withdrawn: {
				recipient: {
					value: "0x27c6762675B685257311Fd15FB6c163e02c337d5",//"0x21F63E63808692B9eFDdBdE4AEF4452dAE5FE632",//"0x27c6762675B685257311Fd15FB6c163e02c337d5",
					error: null,
				},
				amount: {
					display: "",
					error: null,
					value: Currency.DAI(1),
				}
			}
		};

		this.initialSetup.bind(this)
		this.refreshBalances.bind(this);
		this.autoDeposit.bind(this);
		this.autoSwap.bind(this);
		/*this.parseQRCode.bind(this);*/
		this.setWalletConnext.bind(this);
		this.getWalletConnext.bind(this);
		this.getTransferredInfo.bind(this);

		//this.paymentHandler.bind(this);
	}

	// ************************************************* //
	//                     Hooks                         //
	// ************************************************* //

	setWalletConnext = useWalletConnext => {
		// clear any pre-existing sessions
		localStorage.removeItem("wcUri");
		localStorage.removeItem("walletconnect");
		// set wallet connext
		localStorage.setItem("useWalletConnext", !!useWalletConnext);
		this.setState({ useWalletConnext });
		window.location.reload();
	};

	// converts string value in localStorage to boolean
	getWalletConnext = () => {
		const wc = localStorage.getItem("useWalletConnext");
		return wc === "true";
	};

	initWalletConnext = chainId => {
		// item set when you scan a wallet connect QR
		// if a wc qr code has been scanned before, make
		// sure to init the mapping and create new wc
		// connector
		console.log(" --- 0 initWalletConnext ----")
		const uri = localStorage.getItem(`wcUri`);
		const { channel } = this.state;
		if (!channel) return;
		if (!uri) return;
		console.log(" --- 1 initWalletConnext ----")
		initWalletConnect(uri, channel, chainId);
	};

	// Channel doesn't get set up until after provider is set
	async componentDidMount() {
		this.initialSetup()
	}

	async initialSetup() {
		const { machine, state } = this.state;

		console.log("componentDidMount state: ", state)
		machine.start();
		machine.onTransition(state => {
			console.log("state: ", state)

			this.setState({ state });
			console.log(
			`=== Transitioning to ${JSON.stringify(state.value)} (context: ${JSON.stringify(
				state.context,
			)})`,
			);

			//console.log("state.value: ", state.value)
			//console.log("state.context: ", state.context)
			//if (state.value == )
		});

		// If no mnemonic, create one and save to local storage
		let mnemonic = localStorage.getItem("mnemonic");
		const useWalletConnext = this.getWalletConnext() || false;
		console.debug("useWalletConnext: ", useWalletConnext);
		if (!mnemonic && window.location.port == 3333) { // && account exosted in our DB
			//TODO: we need to ask enter mnemonic here
			mnemonic = "version public long wave clarify decline glide health rally rebuild receive crunch";
			localStorage.setItem("mnemonic", mnemonic);
		} else if (!mnemonic && window.location.port == 3000) {
			mnemonic = "media include clever nut account delay unhappy powder resource record tortoise attack";
			localStorage.setItem("mnemonic", mnemonic);
		}
		if (!mnemonic) {
			mnemonic = eth.Wallet.createRandom().mnemonic;
			localStorage.setItem("mnemonic", mnemonic);
		}

		console.log("--- 1 ---- ")
		//TODO: re-check what is useWalletConnext
		let wallet;
		await ethProvider.ready;
		const network = await ethProvider.getNetwork();
		if (!useWalletConnext) {
			wallet = eth.Wallet.fromMnemonic(mnemonic, CF_PATH + "/0").connect(ethProvider);
			this.setState({ network, wallet });
		}

		// migrate if needed
		// TODO: do not concider migration for now we don't have old version
		/*if (wallet && localStorage.getItem("rpc-prod")) {
			machine.send(["MIGRATE", "START_MIGRATE"]);
			await migrate(urls.legacyUrl(network.chainId), wallet, urls.ethProviderUrl);
			localStorage.removeItem("rpc-prod");
		}*/

		machine.send("START");
		machine.send(["START", "START_START"]);

		console.log("--- 2 ---- ")
		// if choose mnemonic
		let channel;
		if (!useWalletConnext) {
			let store;
			const pisaUrl = urls.pisaUrl(network.chainId);
			if (pisaUrl) {
				console.error("Configurated pisaUrl:", wallet);
				//TODO: uncomment implementation

				console.log(`Using external state backup service: ${pisaUrl}`);
				const backupService = new PisaClientBackupAPI({
				  wallet,
				  pisaClient: new PisaClient(
					pisaUrl,
					"0xa4121F89a36D1908F960C2c9F057150abDb5e1E3", //PISA_CONTRACT_ADDRESS TODO: Don't hardcode
				  ),
				});
				store = new ConnextStore(window.localStorage, { backupService });

				//console.log("--- 2.0 ---- ")
				//store = new ConnextStore(window.localStorage);
			} else {
				console.log("--- 2.1 ---- ")
				store = new ConnextStore(window.localStorage);
			}

			console.log("--- 3 ---- ")
			console.log("--- store:", store)
			console.log("--- ConnextClientStorePrefix:", ConnextClientStorePrefix)

			// If store has double prefixes, flush and restore
			for (const k of Object.keys(localStorage)) {
				if (k.includes(`${ConnextClientStorePrefix}:${ConnextClientStorePrefix}/`)) {
				//if (k.includes(`${ConnextClientStorePrefix}/`)) {
					store && (await store.reset());
					window.location.reload();
				}

			}

			console.log("--- 4 ---- ")
			const hdNode = fromExtendedKey(fromMnemonic(mnemonic).extendedKey).derivePath(CF_PATH);
			const xpub = hdNode.neuter().extendedKey;
			const keyGen = index => {
				const res = hdNode.derivePath(index);
				return Promise.resolve(res.privateKey);
			};
			console.log("--- 4.1 ---- ")
			console.log("keyGen:  ", keyGen)
			console.log("xpub:  ", xpub)
			//try {
				channel = await connext.connect({
					ethProviderUrl: urls.ethProviderUrl,
					keyGen,
					logLevel: LOG_LEVEL,
					nodeUrl: urls.nodeUrl,
					store,
					xpub,
				});

				console.log(`mnemonic address: ${wallet.address} (path: ${wallet.path})`);
				console.log(`xpub address: ${eth.utils.computeAddress(fromExtendedKey(xpub).publicKey)}`);
				console.log(
				`keygen address: ${new eth.Wallet(await keyGen("1")).address} (path ${
				  new eth.Wallet(await keyGen("1")).path
				})`,
				);
			/*} catch {
				console.error("Some error occurs during connext.connect: ");

				// TODO: clean local storage excpet mnemonic
				for (const k of Object.keys(localStorage)) {
					if (k.substring(0, 4).includes(`xpub`)) {
						//store && (await store.reset());
						localStorage.removeItem(k);
						console.error("==== 4.2 store.reset==== ", k);
						//window.location.reload();
					} else if (k.includes(`${ConnextClientStorePrefix}/`)) {
						store && (await store.reset());
						console.error("==== 4.2 store.reset==== ", k);
						//window.location.reload();
					}
				}

				//window.location.reload();
			}*/

		} else if (useWalletConnext) {
			console.error("Configurated useWalletConnext.");
			//TODO: uncomment implementation

			/*const channelProvider = new WalletConnectChannelProvider();
			console.log(`Using WalletConnect with provider: ${JSON.stringify(channelProvider, null, 2)}`);
			await channelProvider.enable();
			console.log(
			`ChannelProvider Enabled - config: ${JSON.stringify(channelProvider.config, null, 2)}`,
			);
			// register channel provider listener for logging
			channelProvider.on("error", data => {
				console.error(`Channel provider error: ${JSON.stringify(data, null, 2)}`);
			});
			channelProvider.on("disconnect", (error, payload) => {
			if (error) {
				throw error;
			}
			cleanWalletConnect();
			});
			channel = await connext.connect({
				ethProviderUrl: urls.ethProviderUrl,
				logLevel: LOG_LEVEL,
				channelProvider,
			});*/
		} else {
			console.error("Could not create channel.");
			return;
		}
		console.log(`Successfully connected channel: `, channel);

		//TODO: internal token $ - we need to find the way do not make swap
		const token = new Contract(
			channel.config.contractAddresses.Token,
			tokenArtifacts.abi,
			ethProvider,
		);
		const swapRate = await channel.getLatestSwapRate(AddressZero, token.address);

		console.log("--- 5 ---- ")
		console.log(`Client created successfully!`);
		console.log(` - Public Identifier: ${channel.publicIdentifier}`);
		console.log(` - Account multisig address: ${channel.multisigAddress}`);
		console.log(` - CF Account address: ${channel.signerAddress}`);
		console.log(` - Free balance address: ${channel.freeBalanceAddress}`);
		//TODO: avoid swap
		console.log(` - Token address: ${token.address}`);
		console.log(` - Swap rate: ${swapRate}`);

		//TODO: continue if need....
		channel.subscribeToSwapRates(AddressZero, token.address, res => {
		if (!res || !res.swapRate) return;
			console.log(`Got swap rate upate: ${this.state.swapRate} -> ${res.swapRate}`);
			this.setState({ swapRate: res.swapRate });
		});

		channel.on("RECIEVE_TRANSFER_STARTED", data => {
			console.log("Received RECIEVE_TRANSFER_STARTED event: ", data);
			machine.send("START_RECEIVE");
		});

		channel.on("RECIEVE_TRANSFER_FINISHED", data => {
			console.log("Received RECIEVE_TRANSFER_FINISHED event: ", data);
			machine.send("SUCCESS_RECEIVE");
		});

		channel.on("RECIEVE_TRANSFER_FAILED", data => {
			console.log("Received RECIEVE_TRANSFER_FAILED event: ", data);
			machine.send("ERROR_RECEIVE");
		});

		channel.on("RECEIVE_TRANSFER_FINISHED_EVENT", data => {
			console.log("Received RECEIVE_TRANSFER_FINISHED_EVENT event: ", data);
			this.getTransferredInfo(data.paymentId)
		});

		//channel.on("PROTOCOL_MESSAGE_EVENT", (data) => {
		//	console.log(">>>PROTOCOL_MESSAGE_EVENT: ", data)
		//});

		console.log("--- 6 ---- ")
		this.setState({
			channel,
			useWalletConnext,
			swapRate,
			token,
		});

		// This is important
		// Probably need to ged rid off machine
		/*const saiBalance = Currency.DEI(await this.getSaiBalance(ethProvider), swapRate);
		if (saiBalance && saiBalance.wad.gt(0)) {
			console.log(">>> SAI")
			this.setState({ saiBalance });
			//this.setState({ state: "sai" });
			machine.send("SAI");
		} else {
			console.log(">>> ELSE READY")
			//this.setState({ state: "ready" });
			machine.send("READY");
		}*/

		machine.send("READY");

		console.log("--- 7 ---- ")
		this.initWalletConnext(network.chainId);
		await this.startPoller();
	}

	getSaiBalance = async wallet => {
		const { channel } = this.state;
		if (!channel.config.contractAddresses.SAIToken) {
			return Zero;
		}
		const saiToken = new Contract(
			channel.config.contractAddresses.SAIToken,
			tokenArtifacts.abi,
			wallet,
		);
		const freeSaiBalance = await channel.getFreeBalance(saiToken.address);
		const mySaiBalance = freeSaiBalance[channel.freeBalanceAddress];
		return mySaiBalance;
	};

	// ************************************************* //
	//                    Pollers                        //
	// ************************************************* //

	// What's the minimum I need to be polling for here?
	//  - on-chain balance to see if we need to deposit
	//  - channel messages to see if there anything to sign
	//  - channel eth to see if I need to swap?
	startPoller = async () => {
		const { useWalletConnext } = this.state;
		await this.refreshBalances();
		if (!useWalletConnext) {
			await this.autoDeposit();
			await this.autoSwap(); //TODO: try not to use swap
		} else {
			console.log("Using wallet connext, turning off autodeposit");
		}
		interval(async (iteration, stop) => {
		await this.refreshBalances();
		if (!useWalletConnext) {
			await this.autoDeposit();
			await this.autoSwap(); //TODO: try not to use swap
		}
		}, 3000);
	};

	refreshBalances = async () => {
		const { channel, swapRate } = this.state;
		const { maxDeposit, minDeposit } = await this.getDepositLimits();
		this.setState({ maxDeposit, minDeposit });

		if (!channel || !swapRate) {
			return;
		}
		const balance = await this.getChannelBalances();
		this.setState({ balance });
	};

	getDepositLimits = async () => {
		const { swapRate } = this.state;

		let gasPrice = await ethProvider.getGasPrice();
		let totalDepositGasWei = DEPOSIT_ESTIMATED_GAS.mul(toBN(2)).mul(gasPrice);
		let totalWithdrawalGasWei = WITHDRAW_ESTIMATED_GAS.mul(gasPrice);

		const minDeposit = Currency.WEI(
			totalDepositGasWei.add(totalWithdrawalGasWei),
			swapRate,
		).toETH();

		const maxDeposit = MAX_CHANNEL_VALUE.toETH(swapRate); // Or get based on payment profile?
		return { maxDeposit, minDeposit };
	};

	getChannelBalances = async () => {
		const { balance, channel, swapRate, token } = this.state;
		const getTotal = (ether, token) => Currency.WEI(ether.wad.add(token.toETH().wad), swapRate);
		const freeEtherBalance = await channel.getFreeBalance();
		const freeTokenBalance = await channel.getFreeBalance(token.address);

		// On Chain
		balance.onChain.ether = Currency.WEI(
			await ethProvider.getBalance(channel.signerAddress),
			swapRate,
		).toETH();
		balance.onChain.token = Currency.DEI(
			await token.balanceOf(channel.signerAddress),
			swapRate,
		).toDAI();
		balance.onChain.total = getTotal(balance.onChain.ether, balance.onChain.token).toETH();

		// Channel
		balance.channel.ether = Currency.WEI(
		freeEtherBalance[channel.freeBalanceAddress],
		swapRate,
		).toETH();
		balance.channel.token = Currency.DEI(
			freeTokenBalance[channel.freeBalanceAddress],
			swapRate,
		).toDAI();
		balance.channel.total = getTotal(balance.channel.ether, balance.channel.token).toETH();

		const logIfNotZero = (wad, prefix) => {
		if (wad.isZero()) {
		  return;
		}
		console.debug(`${prefix}: ${wad.toString()}`);
		};

		logIfNotZero(balance.onChain.token.wad, `chain token balance`);
		logIfNotZero(balance.onChain.ether.wad, `chain ether balance`);
		logIfNotZero(balance.channel.token.wad, `channel token balance`);
		logIfNotZero(balance.channel.ether.wad, `channel ether balance`);

		return balance;
	};

	getTransferredInfo = async (paymentId) => {
		const { channel } = this.state;
		const transferData = await channel.getLinkedTransfer(paymentId);

		console.log(">>> transferData: ", transferData)
	}

	autoDeposit = async () => {
		const {
			balance,
			channel,
			machine,
			maxDeposit,
			minDeposit,
			state,
			swapRate,
			token,
		} = this.state;

		//console.log(">>> state.matches:", state)
		if (!state.matches("ready")) {
			console.warn(`Channel not available yet.`);
			return;
		}
		if (
			state.matches("ready.deposit.pending") ||
			state.matches("ready.swap.pending") ||
			state.matches("ready.withdraw.pending")
		) {
			console.warn(`Another operation is pending, waiting to autoswap`);
			return;
		}
		if (balance.onChain.ether.wad.eq(Zero)) {
			console.debug(`No on-chain eth to deposit`);
			return;
		}

		let nowMaxDeposit = maxDeposit.wad.sub(this.state.balance.channel.total.wad);
		if (nowMaxDeposit.lte(Zero)) {
			console.debug(
			  `Channel balance (${balance.channel.total.toDAI().format()}) is at or above ` +
				`cap of ${maxDeposit.toDAI(swapRate).format()}`,
			);
			return;
		}

		if (balance.onChain.token.wad.gt(Zero) || balance.onChain.ether.wad.gt(minDeposit.wad)) {
			machine.send(["START_DEPOSIT"]);
			//this.setState({ state: "pending" });

			if (balance.onChain.token.wad.gt(Zero)) {
			  const amount = minBN([
				Currency.WEI(nowMaxDeposit, swapRate).toDAI().wad,
				balance.onChain.token.wad,
			  ]);
			  const depositParams = {
				amount: amount.toString(),
				assetId: token.address.toLowerCase(),
			  };
			  console.log(
				`Depositing ${depositParams.amount} tokens into channel: ${channel.multisigAddress}`,
			  );
			  const result = await channel.deposit(depositParams);
			  await this.refreshBalances();
			  console.log(`Successfully deposited tokens! Result: ${JSON.stringify(result, null, 2)}`);
			} else {
			  console.debug(`No tokens to deposit`);
			}

			nowMaxDeposit = maxDeposit.wad.sub(this.state.balance.channel.total.wad);
			if (nowMaxDeposit.lte(Zero)) {
			  console.debug(
				`Channel balance (${balance.channel.total.toDAI().format()}) is at or above ` +
				  `cap of ${maxDeposit.toDAI(swapRate).format()}`,
			  );
			  machine.send(["SUCCESS_DEPOSIT"]);
			  //this.setState({ state: "pending" });
			  return;
			}
			if (balance.onChain.ether.wad.lt(minDeposit.wad)) {
			  console.debug(
				`Not enough on-chain eth to deposit: ${balance.onChain.ether.toETH().format()}`,
			  );
			  machine.send(["SUCCESS_DEPOSIT"]);
			  return;
			}

			const amount = minBN([balance.onChain.ether.wad.sub(minDeposit.wad), nowMaxDeposit]);
			console.log(`Depositing ${amount} wei into channel: ${channel.multisigAddress}`);
			const result = await channel.deposit({ amount: amount.toString() });
			await this.refreshBalances();
			console.log(`Successfully deposited ether! Result: ${JSON.stringify(result, null, 2)}`);

			machine.send(["SUCCESS_DEPOSIT"]);
		}
	};

	autoSwap = async () => {
		const { balance, channel, machine, maxDeposit, state, swapRate, token } = this.state;
		if (!state.matches("ready")) {
			console.warn(`Channel not available yet.`);
			return;
		}
		if (
			state.matches("ready.deposit.pending") ||
			state.matches("ready.swap.pending") ||
			state.matches("ready.withdraw.pending")
		) {
			console.warn(`Another operation is pending, waiting to autoswap`);
			return;
		}
		if (balance.channel.ether.wad.eq(Zero)) {
		  console.debug(`No in-channel eth available to swap`);
		  return;
		}
		if (balance.channel.token.wad.gte(maxDeposit.toDAI(swapRate).wad)) {
			console.debug(`Swap ceiling has been reached, no need to swap more`);
			return;
		}

		const maxSwap = tokenToWei(maxDeposit.toDAI().wad.sub(balance.channel.token.wad), swapRate);
		const availableWeiToSwap = minBN([balance.channel.ether.wad, maxSwap]);

		if (availableWeiToSwap.isZero()) {
			// can happen if the balance.channel.ether.wad is 1 due to rounding
			console.debug(`Will not exchange 0 wei. This is still weird, so here are some logs:`);
			console.debug(`   - maxSwap: ${maxSwap.toString()}`);
			console.debug(`   - swapRate: ${swapRate.toString()}`);
			console.debug(`   - balance.channel.ether.wad: ${balance.channel.ether.wad.toString()}`);
			return;
		}

		const hubFBAddress = connext.utils.xpubToAddress(channel.nodePublicIdentifier);
		// in swap, collateral needed is just weiToToken(availableWeiToSwap)
		const tokensForWei = weiToToken(availableWeiToSwap, swapRate);
		let collateral = (await channel.getFreeBalance(token.address))[hubFBAddress];

		console.log(
		  `Hub token collateral: ${formatEther(collateral)}, amount to swap: ${formatEther(
		    tokensForWei,
		  )}`,
		);
		const { collateralizationInFlight } = await channel.getChannel();
		if (tokensForWei.gt(collateral) && !collateralizationInFlight) {
			console.log(`Requesting more collateral...`);
			await channel.requestCollateral(token.address);

			collateral = (await channel.getFreeBalance(token.address))[hubFBAddress];
			console.debug(
				`[after collateral request] Hub token collateral: ${formatEther(
				  collateral,
				)}, amount to swap: ${formatEther(tokensForWei)}`,
			);
			// dont return here, will have added the collateral possible
			// upon return of request collateral function
		}

		// depending on payment profile for user and amount to swap,
		// the amount the hub collateralized could be lte token equivalent
		// of client eth deposit
		const weiToSwap = collateral.sub(tokensForWei).gte(Zero)
			? availableWeiToSwap.toString() // sufficient collateral for entire swap
			: tokenToWei(collateral, swapRate).toString(); // insufficient, claim all hubs balance

		console.log(
			`Attempting to swap ${formatEther(weiToSwap)} eth for ${formatEther(
			weiToToken(weiToSwap, swapRate),
			)} dai at rate: ${swapRate}`,
		);
		machine.send(["START_SWAP"]);

		await channel.swap({
			amount: weiToSwap,
			fromAssetId: AddressZero,
			swapRate,
			toAssetId: token.address,
		});
		await this.refreshBalances();
		machine.send(["SUCCESS_SWAP"]);
	};




	render() {

	const {
		balance,
		channel,
		swapRate,
		machine,
		maxDeposit,
		minDeposit,
		network,
		saiBalance,
		state,
		token,
		wallet,
		send,
		withdrawn,
	} = this.state;

	//console.log(">>>> RENDER: ", state)
	const address = `addr: ${ wallet ? wallet.address : channel ? channel.signerAddress : AddressZero }`;
	const xpub = `xpub: ${ channel ? channel.publicIdentifier : "Unknown" }`
	const { classes } = this.props;

	const minEth = minDeposit ? minDeposit.toETH().format() : '?.??'
	const maxEth = maxDeposit ? maxDeposit.toETH().format() : '?.??'
	const maxDai = maxDeposit ? maxDeposit.toDAI().format() : '?.??'

	var depositTo = `Deposit to address: ${address}`
	var depositMaxMin = `maxDeposit ETH=${maxEth} DAI=${maxDai}`

	//var onChannel = `Deposited on Channel: ERC20 = ${balance.channel.token.toDAI()}, ETH = ${balance.channel.ether.toETH()}`

	//var onChain = `On-Chain: ERC20 = ${balance.onChain.token.toDAI()}, ETH = ${balance.onChain.ether.toETH()}`

	var onChannel = `OnChannel: ERC20 = ${balance.channel.token
                  .toDAI(swapRate)
                  .format({ decimals: 2, symbol: false, round: false })}`

	//var onChannel = `Balance: ERC20 = ${split(balance.channel.token.toDAI()).whole}${split(balance.channel.token.toDAI()).part}`

	//var onChannel = `Deposited on Channel: ERC20 = ${split(balance.channel.token.toDAI()).whole}${split(balance.channel.token.toDAI()).part}, ETH = ${split(balance.channel.ether.toETH()).whole}${split(balance.channel.ether.toETH()).part}`

	var onChain = `OnChain: ERC20 = ${balance.onChain.token
                  .toDAI(swapRate)
                  .format({ decimals: 2, symbol: false, round: false })}`
	//`On-Chain: ERC20 = ${split(balance.onChain.token.toDAI()).whole}${split(balance.onChain.token.toDAI()).part}, ETH = ${split(balance.onChain.ether.toETH()).whole}${split(balance.onChain.ether.toETH()).part}`

	return <div className={classes.base}>
			<div className={classes.base}><p>{ address }</p></div>
			<div>{ depositMaxMin }</div>
			<div><p>{ xpub }</p></div>
			<div><p>{ onChannel }</p></div>
			<div>{ onChain }</div>
			<Button
				disableTouchRipple
				className={classes.button}
				disabled={
					!!send.amount.error ||
					!!send.recipient.error
				}
				fullWidth
				onClick={() => {
					paymentHandler(balance, channel, token, send.amount, send.recipient);
				}}
				size="large"
				variant="contained"
				>
				{ `Send ${ send.amount.value } ERC-20`}
			</Button>
			<div>
				<Button
					disableTouchRipple
					className={classes.button}
					disabled={!withdrawn.recipient.value
					}
					fullWidth
					onClick={() => {
						//balance, channel, token, recipient, swapRate, parent
						cashoutEther(balance, channel, token, withdrawn.recipient, swapRate, this.refreshBalances.bind(this), machine);
					}}
					size="large"
					variant="contained"
					>
					{ `Cashout ETH`}
				</Button>
			</div>
			<div>
				<Button
					disableTouchRipple
					className={classes.button}
					disabled={!withdrawn.recipient.value
					}
					fullWidth
					onClick={() => {
						//balance, channel, token, recipient
						cashoutTokens(balance, channel, token, withdrawn.recipient, machine);
					}}
					size="large"
					variant="contained"
					>
					{ `Cashout ERC-20`}
				</Button>
			</div>
		</div>
	}

}
export default withStyles(styles)(ConnextView);

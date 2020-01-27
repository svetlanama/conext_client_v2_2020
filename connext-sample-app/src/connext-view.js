import React, { Component }  from 'react'
import { Button, CircularProgress, Grid, InputAdornment, Modal, TextField, Tooltip, Typography, withStyles, } from "@material-ui/core"
import * as connext from "@connext/client"
import { toBN, inverse, minBN, tokenToWei, weiToToken } from './utils/bn'
import { Currency }  from './utils/currency'
import { Contract, ethers as eth } from "ethers"

const styles = theme => ({
  icon: {
    width: "40px",
    height: "40px"
  },
  button: {
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


const urls = {
  ethProviderUrl:
    process.env.REACT_APP_ETH_URL_OVERRIDE || `${window.location.origin}/api/ethprovider`,
  nodeUrl:
    process.env.REACT_APP_NODE_URL_OVERRIDE ||
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


// Constants for channel max/min - this is also enforced on the hub
const WITHDRAW_ESTIMATED_GAS = toBN("300000");
const DEPOSIT_ESTIMATED_GAS = toBN("25000");
const MAX_CHANNEL_VALUE = Currency.DAI("30");

class ConnextView extends Component {

	constructor(props) {
		super(props);
		const swapRate = "100.00";
		//const machine = interpret(rootMachine);

		console.log("URLs:", urls)
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
			//machine,
			maxDeposit: null,
			minDeposit: null,
			network: {},
			useWalletConnext: false,
			saiBalance: Currency.DAI("0", swapRate),
			state: 'initialState',//machine.initialState,
			swapRate,
			token: null,
		};

		/*this.refreshBalances.bind(this);
		this.autoDeposit.bind(this);
		this.autoSwap.bind(this);
		this.parseQRCode.bind(this);
		this.setWalletConnext.bind(this);
		this.getWalletConnext.bind(this);*/
  }

	render() {
	/*const {
		address,
		balance,
		channel,
		swapRate,
		maxDeposit,
		minDeposit,
		pending,
		sendScanArgs,
		token,
		xpub,
	} = this.state;

	const minEth = minDeposit ? minDeposit.toETH().format() : '?.??'
	const maxEth = maxDeposit ? maxDeposit.toETH().format() : '?.??'
	const maxDai = maxDeposit ? maxDeposit.toDAI().format() : '?.??'

	var depositTo = `Deposit to address: ${address}`
	var depositMaxMin = `maxDeposit=${maxEth} minDeposit=${minEth}`
	var onChannel = `Deposited on Channel: ERC20 = ${split(balance.channel.token.toDAI()).whole}${split(balance.channel.token.toDAI()).part}, ETH = ${split(balance.channel.ether.toETH()).whole}${split(balance.channel.ether.toETH()).part}`

	var onChain = `On-Chain: ERC20 = ${split(balance.onChain.token.toDAI()).whole}${split(balance.onChain.token.toDAI()).part}, ETH = ${split(balance.onChain.ether.toETH()).whole}${split(balance.onChain.ether.toETH()).part}`
	*/
	return <div> kuku </div>
	}

}
export default withStyles(styles)(ConnextView);

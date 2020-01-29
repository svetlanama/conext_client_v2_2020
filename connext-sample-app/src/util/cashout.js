import { toBN, inverse, minBN, tokenToWei, weiToToken } from '../utils/bn'
import { AddressZero, Zero } from "ethers/constants";

export const cashoutTokens = async (balance, channel, token, recipient, machine) => {
	console.log("ERC20 balance:", balance)
	console.log("ERC20 channel:", channel)
	console.log("ERC20 token:", token)
	console.log("ERC20 recipient:", recipient)


	const value = recipient.value;
	if (!channel || !value) return;

	const total = balance.channel.total;
	if (total.wad.lte(Zero)) return;

	// Put lock on actions, no more autoswaps until we're done withdrawing
	machine.send("START_WITHDRAW");
	console.log("START_WITHDRAW: ")
	// TODO: think about states
	//setWithdrawing(true);
	console.log(`Withdrawing ${total.toETH().format()} to: ${value}`);
	const result = await channel.withdraw({
		amount: balance.channel.token.wad.toString(),
		assetId: token.address,
		recipient: value,
	});
	console.log(`Cashout result: ${JSON.stringify(result)}`);
	const txHash = result.transaction.hash;
	// TODO: think about states
	//setWithdrawing(false);
	console.log("SUCCESS_WITHDRAW: ", txHash)
	machine.send("SUCCESS_WITHDRAW", { txHash });
};

export const cashoutEther = async (balance, channel, token, recipient, swapRate, refreshBalances, machine) => {
	console.log("ETH balance:", balance)
	console.log("ETH channel:", channel)
	console.log("ETH token:", token)
	console.log("ETH recipient:", recipient)
	console.log("ETH swapRate:", swapRate)
	console.log("ETH refreshBalances:", refreshBalances)
	const value = recipient.value;
	if (!channel || !value) return;

	const total = balance.channel.total;
	if (total.wad.lte(Zero)) return;

	// Put lock on actions, no more autoswaps until we're done withdrawing
	machine.send("START_WITHDRAW");
	console.log("START_WITHDRAW: ")
	// TODO: think about states
	//setWithdrawing(true);
	console.log(`Withdrawing ${total.toETH().format()} to: ${value}`);
	// swap all in-channel tokens for eth
	if (balance.channel.token.wad.gt(Zero)) {
		await channel.requestCollateral(AddressZero);
		await channel.swap({
			amount: balance.channel.token.wad.toString(),
			fromAssetId: token.address,
			swapRate: inverse(swapRate),
			toAssetId: AddressZero,
		});
		//TODO: call this somehow via parent
		console.log("Balance is zero:", balance.channel.token.wad)
		//await refreshBalances();
	}
	console.log(">>> channel.withdraw:")
	const result = await channel.withdraw({
		amount: balance.channel.ether.wad.toString(),
		assetId: AddressZero,
		recipient: value,
	});

	console.log(`Cashout result: ${JSON.stringify(result)}`);
	const txHash = result.transaction.hash;
	//setWithdrawing(false);
	console.log("SUCCESS_WITHDRAW: ", txHash)
	machine.send("SUCCESS_WITHDRAW", { txHash });
};

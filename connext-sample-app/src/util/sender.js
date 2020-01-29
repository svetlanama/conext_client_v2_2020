import { hexlify, randomBytes } from "ethers/utils";

export const paymentHandler = async (balance, channel, token, amount, recipient) => {

	console.log(">>> paymentHandler: ")
	//const [recipient, setRecipient, setRecipientError] = useXpub(null, ethProvider);

	if (!channel || !token || amount.error || recipient.error) return;
	if (!recipient.value) {
		console.log("Recipent must be specified for p2p transfer")
		//setRecipientError("Recipent must be specified for p2p transfer");
		return;
	}
	console.log(`Sending ${amount.value} to ${recipient.value}`);
	console.log(`NEW_P2P`);
	//paymentAction("NEW_P2P"); // machine state

	// there is a chance the payment will fail when it is first sent
	// due to lack of collateral. collateral will be auto-triggered on the
	// hub side. retry for 1min, then fail
	const endingTs = Date.now() + 60 * 1000;
	let transferRes = undefined;
	while (Date.now() < endingTs) {
		console.log(`payment .....`);
		try {
		  transferRes = await channel.conditionalTransfer({
			assetId: token.address,
			amount: amount.value.wad.toString(),
			conditionType: "LINKED_TRANSFER_TO_RECIPIENT",
			paymentId: hexlify(randomBytes(32)),
			preImage: hexlify(randomBytes(32)),
			recipient: recipient.value,
			meta: { source: "daicard" }
		  });
		  console.log(`payment .....try:`, transferRes);
		  break;
		} catch (e) {
			console.log(`payment .....error:`, e);
			await new Promise(res => setTimeout(res, 5000));
		}
	}

	if (!transferRes) {
		console.log(`paymentAction ERROR:`, transferRes);
		//paymentAction("ERROR");
		return;
	}
	console.log(`paymentAction DONE`);
	//paymentAction("DONE");
};

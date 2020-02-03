import { hexlify, randomBytes } from "ethers/utils";
import { useMachine } from "@xstate/react";
import { sendMachine } from "../state/send";



export const paymentHandler = async (balance, channel, token, amount, recipient) => {

	//console.log(">>> paymentHandler: ", sendMachine)
	//TODO: here
	//const [paymentState, paymentAction] = useMachine(sendMachine);
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
			var t0 = performance.now();
		transferRes = await channel.conditionalTransfer({
			assetId: token.address,
			amount: amount.value.wad.toString(),
			conditionType: "LINKED_TRANSFER_TO_RECIPIENT",
			paymentId: hexlify(randomBytes(32)),
			preImage: hexlify(randomBytes(32)),
			recipient: recipient.value,
			meta: { source: "daicard meta data" }
		  });
		  console.log(`payment .....try:`, transferRes);
		  var t1 = performance.now();
		  console.log("Call to conditionalTransfer took " + (t1 - t0) + " milliseconds.");
		  //Call to conditionalTransfer took 5817.46499997098 milliseconds.
		  //Call to conditionalTransfer took 8299.064999970142 milliseconds.
		  //Call to conditionalTransfer took 6306.770000024699 milliseconds.
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
	console.log(`paymentAction DONE: `, transferRes);
	//paymentAction("DONE");

	console.log(`paymentAction DONE paymentId: `, transferRes.paymentId);
	var transferData = await channel.getLinkedTransfer(transferRes.paymentId);
	console.log("getTransferredInfo: ", transferData)
};

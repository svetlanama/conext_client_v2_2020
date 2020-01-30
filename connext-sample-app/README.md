## RUN

```cd connext-sample-app```

```npm install```

```npm start``` - user 1

```PORT=333 npm start``` - user 2


**After getting xpub set them to variables**

xpubUser1 - PORT 3000

xpubUser2  - PORT 3333

To setup account for withdraw:
put you eth address withdrawn -> recipient -> value

## TEST RESULTS

**Chrome:**
- deposit ETH: YES
- deposit tokens:  YES

- send tokens: YES (sometimes troubles)
- receiving tokens: YES

- cashout ETH: YES , error (when you are sending many times to one account, known issue)
- cashout TOKENS: YES

**FF:**
- deposit ETH: YES
- deposit tokens:  YES (stay on Chain) - can take 2-5 mins to move on Channel (working case after depositing ETH) (screen )

- send tokens: YES
- receiving tokens: YES

- cashout ETH: YES , error (when you are sending many times to one account)
- cashout TOKENS: YES


**Safari:**
- deposit ETH: YES
- deposit tokens: YES (stay on Chain) -  can take 2-5 mins to move on Channel (working case after depositing ETH)

- send tokens: YES
- receiving tokens: YES

- cashout ETH: YES
- cashout TOKENS: YES

**Note:**
- Safari can't see that xpub.... are store in local storage apart from others
- From time-to-time some errors occured which need to be handled

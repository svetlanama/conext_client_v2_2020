## RUN

```connext-sample-app```
```npm install```
```npm start``` - user 1
```PORT=333 npm start``` - user 2

After getting xpub set them to variables 
xpubUser1 - PORT 3000
xpubUser2  - PORT 3333

To setup account for withdraw:
put you eth address withdrawn -> recipient -> value

## TEST TESULTS

Chrome
deposit ETH: +
deposit tokens:  +

send tokens: + (sometimes troubles)
receiving tokens: +
cashout ETH: + , error (when you are sending many times to one account)
cashout TOKENS: +

FF:
deposit ETH: +
deposit tokens:  + (stay on Chain) - can take 2-5 mins to move on Channel (working case after depositing ETH) (screen )

send tokens: +
receiving tokens: +

cashout ETH: + , error (when you are sending many times to one account)
cashout TOKENS: +


Safari:
deposit ETH:
deposit tokens: + (stay on Chain) -  can take 2-5 mins to move on Channel (working case after depositing ETH)

send tokens:+
receiving tokens: +

cashout ETH:+
cashout TOKENS: +

Note:
can't see that xpub.... are store in local storage apart from others
from time-to-time some errors occured which need to be handled

var express = require('express');
var router = express.Router();
const Web3 = require('web3');

let web3 = null;
let tokenName = '';
let tokenSymbol = '';
let tokenDecimals = 0;
let maxSell = 0;
let maxTXAmount = 0;
let bnbIN = 1000000000000000000;
let maxTxBNB = null;
let result = '';

web3 = new Web3('https://bsc-dataseed.binance.org/');

async function isHoneypot(address) {
  await isHoney(address);
}

function isHoney(address) {
  console.log('token for honeypot check:' + address);
  run(address);
}

/* GET home page. */
router.get('/:addresss', function(req, res) {
  input = req.params.addresss;
  console.log(input);
  isHoneypot(input);
  res.header('Content-type', 'text/plain');
  res.status(200).send(result);
});

function encodeBasicFunction(web3, funcName) {
  return web3.eth.abi.encodeFunctionCall({
      name: funcName,
      type: 'function',
      inputs: []
  }, []);
}

async function updateTokenInformation(web3, tokenAddress) {
  web3.eth.call({
      to: tokenAddress,
      value: 0,
      gas: 150000,
      data: encodeBasicFunction(web3, 'name'),
  })
      .then(value => {
          tokenName = web3.eth.abi.decodeParameter('string', value);
      });

  web3.eth.call({
      to: tokenAddress,
      value: 0,
      gas: 150000,
      data: encodeBasicFunction(web3, 'symbol'),
  })
      .then(value => {
          tokenSymbol = web3.eth.abi.decodeParameter('string', value);
      });
}

async function run(address) {
  x = updateTokenInformation(web3, address);
  await getMaxes();
  if (maxTXAmount != 0 || maxSell != 0) {
      await getDecimals(address);
      await getBNBIn(address);
  }
  let result = await honeypotIs(address);
  await x;
  return result;
}

async function getDecimals(address) {
  let sig = encodeBasicFunction(web3, 'decimals');
  d = {
      to: address,
      from: '0x8894e0a0c962cb723c1976a4421c95949be2d4e3',
      value: 0,
      gas: 15000000,
      data: sig,
  };
  try {
      let val = await web3.eth.call(d);
      tokenDecimals = web3.utils.hexToNumber(val);
  } catch (e) {
      //console.log('decimals', e);
  }
}

async function getBNBIn(address) {
  let amountIn = maxTXAmount;
  if (maxSell != 0) {
      amountIn = maxSell;
  }
  let WETH = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c';
  let path = [address, WETH];
  let sig = web3.eth.abi.encodeFunctionCall({
      name: 'getAmountsOut',
      type: 'function',
      inputs: [{
          type: 'uint256',
          name: 'amountIn'
      }, {
          type: 'address[]',
          name: 'path'
      },
      ],
      outputs: [{
          type: 'uint256[]',
          name: 'amounts'
      },
      ],
  }, [amountIn, path]);

  d = {
      to: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
      from: '0x8894e0a0c962cb723c1976a4421c95949be2d4e3',
      value: 0,
      gas: 15000000,
      data: sig,
  };
  try {
      let val = await web3.eth.call(d);
      let decoded = web3.eth.abi.decodeParameter('uint256[]', val);
      bnbIN = web3.utils.toBN(decoded[1]);
      maxTxBNB = bnbIN;
  } catch (e) {
      //console.log(e);
  }
  //console.log(bnbIN, amountIn);
}

async function getMaxes(address) {
  let sig = web3.eth.abi.encodeFunctionSignature({
      name: '_maxTxAmount',
      type: 'function',
      inputs: []
  });
  d = {
      to: address,
      from: '0x8894e0a0c962cb723c1976a4421c95949be2d4e3',
      value: 0,
      gas: 15000000,
      data: sig,
  };
  try {
      let val = await web3.eth.call(d);
      maxTXAmount = web3.utils.toBN(val);
      //console.log(val, maxTXAmount);
  } catch (e) {
      //console.log('_maxTxAmount: ', e);
      // I will nest as much as I want. screw javascript.
      sig = web3.eth.abi.encodeFunctionSignature({
          name: 'maxSellTransactionAmount',
          type: 'function',
          inputs: []
      });
      d = {
          to: address,
          from: '0x8894e0a0c962cb723c1976a4421c95949be2d4e3',
          value: 0,
          gas: 15000000,
          data: sig,
      };
      try {
          let val2 = await web3.eth.call(d);
          maxSell = web3.utils.toBN(val2);
          //console.log(val2, maxSell);
      } catch (e) { }
  }
}

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

async function honeypotIs(address) {
  let encodedAddress = web3.eth.abi.encodeParameter('address', address);
  let contractFuncData = '0xd66383cb';
  let callData = contractFuncData + encodedAddress.substring(2);

  let val = 100000000000000000;
  if (bnbIN < val) {
      val = bnbIN - 1000;
  }
  web3.eth.call({
      to: '0x5bf62ec82af715ca7aa365634fab0e8fd7bf92c7',
      from: '0x8894e0a0c962cb723c1976a4421c95949be2d4e3',
      value: val,
      gas: 45000000,
      data: callData,
  })
      .then((val) => {
          let decoded = web3.eth.abi.decodeParameters(['uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256'], val);
          let buyExpectedOut = web3.utils.toBN(decoded[0]);
          let buyActualOut = web3.utils.toBN(decoded[1]);
          let sellExpectedOut = web3.utils.toBN(decoded[2]);
          let sellActualOut = web3.utils.toBN(decoded[3]);
          let buyGasUsed = web3.utils.toBN(decoded[4]);
          let sellGasUsed = web3.utils.toBN(decoded[5]);
          buy_tax = Math.round((buyExpectedOut - buyActualOut) / buyExpectedOut * 100 * 10) / 10;
          sell_tax = Math.round((sellExpectedOut - sellActualOut) / sellExpectedOut * 100 * 10) / 10;
          let maxdiv = '';
          if (maxTXAmount != 0 || maxSell != 0) {
              let n = 'Max TX';
              let x = maxTXAmount;
              if (maxSell != 0) {
                  n = 'Max Sell';
                  x = maxSell;
              }
              let bnbWorth = '?'
              if (maxTxBNB != null) {
                  bnbWorth = Math.round(maxTxBNB / 10 ** 15) / 10 ** 3;
              }
              let tokens = Math.round(x / 10 ** tokenDecimals);
              maxdiv = '<p>' + n + ': ' + tokens + ' ' + tokenSymbol + ' (~' + bnbWorth + ' BNB)</p>';
          }
          result = false;
          //console.log(tokenName + ' (' + tokenSymbol + ') ' + 'looks safe atm! Buy tax: ' + buy_tax + ', sell tax: ' + sell_tax);
      })
      .catch(err => {
          //console.log(true);
          result = true;
      });
  updateTokenInformation(web3, address);
}

module.exports = router;

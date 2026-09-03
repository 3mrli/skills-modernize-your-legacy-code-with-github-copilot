const readline = require('node:readline/promises');
const { stdin: input, stdout: output } = require('node:process');

const INITIAL_BALANCE_CENTS = 100000;
const MAX_BALANCE_CENTS = 99999999;

class AccountData {
  constructor() {
    this.balanceCents = INITIAL_BALANCE_CENTS;
  }

  read() {
    return this.balanceCents;
  }

  write(balanceCents) {
    this.balanceCents = balanceCents;
  }
}

function formatBalance(balanceCents) {
  const wholeUnits = Math.floor(balanceCents / 100);
  const cents = balanceCents % 100;
  return `${String(wholeUnits).padStart(6, '0')}.${String(cents).padStart(2, '0')}`;
}

function parseAmount(amountText) {
  const normalizedAmount = amountText.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalizedAmount)) {
    return null;
  }

  const [wholeUnits, fractionalUnits = ''] = normalizedAmount.split('.');
  const amountCents = Number(wholeUnits) * 100 + Number(fractionalUnits.padEnd(2, '0'));
  return Number.isSafeInteger(amountCents) ? amountCents : null;
}

async function readAmount(prompt, rl, log = console.log) {
  const amountText = await rl.question(prompt);
  const amountCents = parseAmount(amountText);
  if (amountCents === null) {
    log('Invalid amount, please enter a valid amount with up to two decimal places.');
  }
  return amountCents;
}

async function creditAccount(data, rl, log = console.log) {
  const amountCents = await readAmount('Enter credit amount: ', rl, log);
  if (amountCents === null) {
    return;
  }

  const currentBalanceCents = data.read();
  const updatedBalanceCents = currentBalanceCents + amountCents;
  if (updatedBalanceCents > MAX_BALANCE_CENTS) {
    log('Invalid amount, please enter a valid amount with up to two decimal places.');
    return;
  }

  data.write(updatedBalanceCents);
  log(`Amount credited. New balance: ${formatBalance(data.read())}`);
}

async function debitAccount(data, rl, log = console.log) {
  const amountCents = await readAmount('Enter debit amount: ', rl, log);
  if (amountCents === null) {
    return;
  }

  const currentBalanceCents = data.read();
  if (currentBalanceCents >= amountCents) {
    data.write(currentBalanceCents - amountCents);
    log(`Amount debited. New balance: ${formatBalance(data.read())}`);
  } else {
    log('Insufficient funds for this debit.');
  }
}

function createReadlineInterface() {
  return readline.createInterface({ input, output });
}

async function run(rl = createReadlineInterface(), log = console.log) {
  const data = new AccountData();
  let continueRunning = true;

  try {
    while (continueRunning) {
      log('--------------------------------');
      log('Account Management System');
      log('1. View Balance');
      log('2. Credit Account');
      log('3. Debit Account');
      log('4. Exit');
      log('--------------------------------');
      const choice = await rl.question('Enter your choice (1-4): ');

      switch (choice.trim()) {
        case '1':
          log(`Current balance: ${formatBalance(data.read())}`);
          break;
        case '2':
          await creditAccount(data, rl, log);
          break;
        case '3':
          await debitAccount(data, rl, log);
          break;
        case '4':
          continueRunning = false;
          break;
        default:
          log('Invalid choice, please select 1-4.');
      }
    }
  } finally {
    rl.close();
  }

  log('Exiting the program. Goodbye!');
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  AccountData,
  creditAccount,
  debitAccount,
  formatBalance,
  parseAmount,
  run,
};

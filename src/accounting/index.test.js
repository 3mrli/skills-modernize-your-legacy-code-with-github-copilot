const test = require('node:test');
const assert = require('node:assert/strict');

const {
  AccountData,
  creditAccount,
  debitAccount,
  formatBalance,
  parseAmount,
  run,
} = require('./index');

function fakeReadline(answers) {
  return {
    question: async () => answers.shift(),
    close() {},
  };
}

function captureLog() {
  const messages = [];
  return { messages, log: (message) => messages.push(message) };
}

test('TC-001/TC-002: starts at and displays the initial balance', async () => {
  const output = captureLog();

  await run(fakeReadline(['1', '4']), output.log);

  assert.ok(output.messages.includes('Current balance: 001000.00'));
  assert.ok(output.messages.includes('Account Management System'));
  assert.ok(output.messages.includes('1. View Balance'));
  assert.ok(output.messages.includes('2. Credit Account'));
  assert.ok(output.messages.includes('3. Debit Account'));
  assert.ok(output.messages.includes('4. Exit'));
});

test('TC-003/TC-004: credits whole amounts and cents', async () => {
  const data = new AccountData();
  const output = captureLog();

  await creditAccount(data, fakeReadline(['250']), output.log);
  assert.equal(formatBalance(data.read()), '001250.00');
  assert.ok(output.messages.includes('Amount credited. New balance: 001250.00'));

  await creditAccount(data, fakeReadline(['12.34']), output.log);
  assert.equal(formatBalance(data.read()), '001262.34');
  assert.ok(output.messages.includes('Amount credited. New balance: 001262.34'));
});

test('TC-005: retains multiple credits during one run', async () => {
  const data = new AccountData();
  const output = captureLog();

  await creditAccount(data, fakeReadline(['100.50']), output.log);
  await creditAccount(data, fakeReadline(['25.25']), output.log);

  assert.equal(formatBalance(data.read()), '001125.75');
});

test('TC-006/TC-007: accepts sufficient and exact-balance debits', async () => {
  const data = new AccountData();
  const output = captureLog();

  await debitAccount(data, fakeReadline(['275.40']), output.log);
  assert.equal(formatBalance(data.read()), '000724.60');
  assert.ok(output.messages.includes('Amount debited. New balance: 000724.60'));

  await debitAccount(data, fakeReadline(['724.60']), output.log);
  assert.equal(formatBalance(data.read()), '000000.00');
  assert.ok(output.messages.includes('Amount debited. New balance: 000000.00'));
});

test('TC-008/TC-009: rejects debits above the current balance without writing', async () => {
  const data = new AccountData();
  const output = captureLog();

  await creditAccount(data, fakeReadline(['100.00']), output.log);
  await debitAccount(data, fakeReadline(['1100.01']), output.log);

  assert.equal(formatBalance(data.read()), '001100.00');
  assert.ok(output.messages.includes('Insufficient funds for this debit.'));
});

test('TC-010/TC-011/TC-012: loops after operations, rejects invalid choices, and exits', async () => {
  const output = captureLog();

  await run(fakeReadline(['9', '1', '4']), output.log);

  assert.ok(output.messages.includes('Invalid choice, please select 1-4.'));
  assert.equal(output.messages.filter((message) => message === 'Account Management System').length, 3);
  assert.equal(output.messages.at(-1), 'Exiting the program. Goodbye!');
});

test('TC-013/TC-024: initializes each data store independently and formats balances', () => {
  const firstRun = new AccountData();
  firstRun.write(0);
  const secondRun = new AccountData();

  assert.equal(formatBalance(firstRun.read()), '000000.00');
  assert.equal(formatBalance(secondRun.read()), '001000.00');
  assert.equal(formatBalance(secondRun.read() + parseAmount('0.01')), '001000.01');
});

test('TC-014/TC-015/TC-016: reads and writes shared account data', async () => {
  const data = new AccountData();
  const output = captureLog();

  await creditAccount(data, fakeReadline(['50.00']), output.log);
  assert.equal(data.read(), 105000);
  await debitAccount(data, fakeReadline(['1.00']), output.log);
  assert.equal(data.read(), 104900);
  assert.equal(formatBalance(data.read()), '001049.00');
});

test('TC-017/TC-018: accepts zero-value credit and debit without changing balance', async () => {
  const data = new AccountData();
  const output = captureLog();

  await creditAccount(data, fakeReadline(['0.00']), output.log);
  await debitAccount(data, fakeReadline(['0.00']), output.log);

  assert.equal(formatBalance(data.read()), '001000.00');
  assert.ok(output.messages.includes('Amount credited. New balance: 001000.00'));
  assert.ok(output.messages.includes('Amount debited. New balance: 001000.00'));
});

test('TC-019/TC-020/TC-021: rejects negative, malformed, and oversized amounts safely', async () => {
  const data = new AccountData();
  const output = captureLog();

  assert.equal(parseAmount('-1.00'), null);
  assert.equal(parseAmount('ABC'), null);
  assert.equal(parseAmount('1.234'), null);
  await creditAccount(data, fakeReadline(['1000000.00']), output.log);

  assert.equal(formatBalance(data.read()), '001000.00');
  assert.equal(output.messages.length, 1);
  assert.match(output.messages[0], /^Invalid amount/);
});

test('TC-022/TC-023: unsupported operation values have no data effect', () => {
  const data = new AccountData();
  const originalBalance = data.read();

  assert.equal(parseAmount('UNSUPPORTED'), null);
  assert.equal(data.read(), originalBalance);
});
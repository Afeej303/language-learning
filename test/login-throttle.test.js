import test from 'node:test';
import assert from 'node:assert/strict';
import { clientIp, throttleKey } from '../src/login-throttle.js';

test('login throttle keys separate usernames sharing an IP', () => {
  assert.notEqual(throttleKey('alice', '127.0.0.1'), throttleKey('bob', '127.0.0.1'));
  assert.equal(throttleKey(' Alice ', '127.0.0.1'), throttleKey('alice', '127.0.0.1'));
  assert.notEqual(throttleKey('alice', '127.0.0.1'), throttleKey('alice', '127.0.0.2'));
});

test('only configured proxy header is trusted and first forwarded IP is used', () => {
  const req = { socket: { remoteAddress: '10.0.0.2' }, headers: { 'x-forwarded-for': '198.51.100.4, 10.0.0.1' } };
  assert.equal(clientIp(req, ''), '10.0.0.2');
  assert.equal(clientIp(req, 'x-forwarded-for'), '198.51.100.4');
  assert.equal(clientIp(req, 'x-real-ip'), '10.0.0.2');
});

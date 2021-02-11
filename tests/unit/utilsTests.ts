/*
 * Copyright 2019. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

import assert from 'assert';
import sinon from 'sinon';
import mock from 'mock-fs';
import nock from 'nock';

/* eslint-disable global-require */
sinon.stub(process, 'env').value({ F5_BIGIP_RUNTIME_INIT_LOG_LEVEL: 'info' });

describe('Util', () => {
    let util;

    before(() => {
        util = require('../../src/lib/utils.ts');
    });
    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });


    describe('retrier', () => {
        it('should validate resolve', () => {
            const fakeFuncSpy = sinon.stub().resolves();

            return util.retrier(fakeFuncSpy, [], { })
                .then(() => assert.strictEqual(fakeFuncSpy.callCount, 1))
                .catch(err => Promise.reject(err));
        });

        it('should validate reject', () => {
            const fakeFuncSpy = sinon.stub().rejects();
            const retryCount = 2;

            return util.retrier(fakeFuncSpy, [], { maxRetries: retryCount, retryInterval: 10 })
                .then(() => assert.fail())
                .catch(() => assert.strictEqual(fakeFuncSpy.callCount, retryCount));
        });
    });

    describe('renderData', () => {
        it('should validate renderData with correct inputs', async () => {
            const response = await util.renderData('{{ TEST_VALUE }} - TRUE',
                { TEST_VALUE: 'TRUE' });
            assert.strictEqual(response, 'TRUE - TRUE');
        });
    });

    describe('makeRequest', () => {
        afterEach(() => {
            if(!nock.isDone()) {
                throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`)
            }
            nock.cleanAll();
            mock.restore();
        });
        it('should make request (HTTP)', async () => {
            nock('https://192.0.2.1')
                .get('/')
                .reply(200, { foo: 'bar' });

            const response = await util.makeRequest('https://192.0.2.1/');
            assert.deepStrictEqual(response, { code: 200, body: { foo: 'bar' } });
        });

        it('should fail request (FTP)', async () => {
            util.makeRequest('ftp://192.0.2.1/')
                .then(() => assert.fail())
                .catch((error) => assert.ok(error.message.includes('Invalid protocol')));
        });
    });

    describe('verifyHash', () => {
        it('should return true with valid extension hash inputs', () => {
            mock({
                'fake/dir': {
                    'fake.txt': '12345'
                }
            });

            const file = 'fake/dir/fake.txt';
            const extensionHash = '5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5';
            const response = util.verifyHash(file, extensionHash);

            assert.strictEqual(response, true);
            mock.restore();
        });

        it('should return false with invalid extension hash inputs', () => {
            mock({
                'fake/dir': {
                    'fake.txt': '12345'
                }
            });

            const file = 'fake/dir/fake.txt';
            const extensionHash = 'abc';

            assert.ok(!util.verifyHash(file, extensionHash));
            mock.restore();
        });
    });

    describe('validate verifyDirectory', () => {
        it('should validate verifyDirectory does not create directory', () => {
            mock({
                'fake/dir': mock.directory({
                    mode: '0755'
                })
            });
            util.verifyDirectory('fake/dir');
            assert.ok(true);
            mock.restore();
        });

        it('should validate verifyDirectory creates directory', () => {
            mock({
                'fake/dir': mock.directory({})
            });
            util.verifyDirectory('fake/dir');
            assert.ok(true);
            mock.restore();
        });
    });

    describe('validate runShellCommand', () => {
        it('should validate runShellCommand creates directory', () => {
            return util.runShellCommand('echo test')
                .then((response) => assert.notStrictEqual('test', response))
                .catch(err => Promise.reject(err));
        });

        it('should validate runShellCommand with invalidate command', () => {
            return util.runShellCommand('invalid-shell-command')
                .then(() => assert.ok(false))
                .catch((err) => assert.notStrictEqual(err.message, '/bin/sh: invalid-shell-command: command not found'))
        });
    });

    describe('validate loadData', () => {
        afterEach(() => {
            if(!nock.isDone()) {
                throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`)
            }
            nock.cleanAll();
            mock.restore();
        });
        it('should validate loadData successful execution via FILE', () => {
            mock({
                '/var/lib/cloud/': {
                    'fake.txt': '12345'
                }
            });

            return util.loadData( 'file:////var/lib/cloud/fake.txt', {
                    locationType: 'file'
                })
                .then((resp) => assert.strictEqual(resp, 12345))
                .catch(err => Promise.reject(err));
        });

        it('should validate loadData successful execution via FILE with default options', () => {
            mock({
                '/var/lib/cloud/': {
                    'fake.txt': '12345'
                }
            });

            return util.loadData( 'file:////var/lib/cloud/fake.txt')
                .then((resp) => assert.strictEqual(resp, 12345))
                .catch(err => Promise.reject(err));
        });

        it('should validate loadData successful execution via URL', () => {
            nock('https://fakedomain.com')
                .get('/awesome_file.txt')
                .reply(200, {
                    id: 1
                });

            return util.loadData( 'https://fakedomain.com/awesome_file.txt', {
                locationType: 'url',
                verifyTls: false
            })
                .then((resp) => assert.strictEqual(resp.id, 1))
                .catch(err => Promise.reject(err));
        });

        it('should validate loadData failed execution via URL', () => {
            nock('https://fakedomain.com')
                .get('/awesome_file.txt')
                .replyWithError('Not found');

            return util.loadData( 'https://fakedomain.com/awesome_file.txt', {
                locationType: 'url'
            })
                .then(() => assert.ok(false))
                .catch(err => assert.ok(err.message.includes('Not found')));
        });

        it('should validate loadData failure due to unknown type', () => {
            return util.loadData( 'sbn:////fakedomain.com/awesome_file.txt', {
                locationType: 'sbn'
            })
                .then(() => assert.ok(false))
                .catch((err) => assert.ok(err.message.includes('Unknown url type')))
        });
    });

    describe('validate downloadToFile', () => {
        afterEach(() => {
            if(!nock.isDone()) {
                throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`)
            }
            nock.cleanAll();
            mock.restore();
        });

        it('should validate downloadToFile successful execution', () => {
            nock('https://fakedomain.com')
                .get('/awesome_file.txt')
                .reply(200, {
                    id: 1
                });
            return util.downloadToFile( 'https://fakedomain.com/awesome_file.txt', 'test_file.txt')
                .catch(err => Promise.reject(err));
        });

        it('should validate downloadToFile failure', () => {
            nock('https://fakedomain.com')
                .get('/awesome_file.txt')
                .replyWithError('Not found');
            return util.downloadToFile( 'https://fakedomain.com/awesome_file.txt', 'test_file.txt')
                .catch((err) => assert.ok(err.message.includes('Not found')));
        });
    })
});
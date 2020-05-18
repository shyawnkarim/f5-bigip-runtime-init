/**
 * Copyright 2020 F5 Networks, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const Logger = require('../../logger.js');


/**
 * Abstract Cloud class - defines cloud agnostic properties and methods
 *
 * @class
 */

class AbstractCloudClient {
    constructor(name, options) {
        this.environment = name;

        const logger = options ? options.logger : Logger;
        if (logger) {
            this.logger = logger;
        }
    }


    /**
     * Gets secret
     *
     * @param {Object} options - function options
     */
    getSecret() {
        throw new Error('getSecret method must be implemented in child class!');
    }

    /**
     * Gets metadata
     *
     * @param {Object} options - function options
     */
    getMetadata() {
        throw new Error('getMetadata method must be implemented in child class!');
    }
}

module.exports = {
    AbstractCloudClient
};

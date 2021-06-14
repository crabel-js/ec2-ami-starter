import {config} from './config';
import * as aws from './aws';
import * as gh  from "./gh";
import * as core from '@actions/core';

function setOutput(label, ec2InstanceId) {
    core.setOutput('label', label);
    core.setOutput('ec2-instance-id', ec2InstanceId);
}

async function start() {
    const label = config.generateUniqueLabel();
    const regToken = await gh.getRegistrationToken();
    core.info("Waiting for prior build jobs to complete");

    const ec2InstanceId = await aws.startEc2Instance(label, regToken);
    setOutput(label, ec2InstanceId);
    await aws.waitForInstanceRunning(ec2InstanceId);
    await gh.waitForRunnerRegistered(label);
}

async function stop() {
    await aws.terminateEc2Instance();
    await gh.removeRunner();
}

(async function () {
    try {
        config.input.mode === 'start' ? await start() : await stop();
    }
    catch (error) {
        core.error(error);
        core.setFailed(error.message);
    }
})();

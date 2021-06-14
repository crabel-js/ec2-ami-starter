import {EC2} from 'aws-sdk';
import {InstanceId, DescribeInstancesRequest} from 'aws-sdk/clients/ec2';
import {RunInstancesRequest} from "aws-sdk/clients/ec2";
import * as core from '@actions/core';
import {config} from './config';

export async function startEc2Instance(label: string, githubRegistrationToken: string) {
    const ec2 = new EC2();

    // User data scripts are run as the root user.
    // Docker and git are necessary for GitHub runner and should be pre-installed on the AMI.
    const userData = [
        '#!/bin/bash',
        'cd actions-runner',
        'export RUNNER_ALLOW_RUNASROOT=1',
        'export DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1',
        `./config.sh --name $(hostname -s) --work _work --url https://github.com/${config.githubContext.owner}/${config.githubContext.repo} --token ${githubRegistrationToken} --labels ${label}`,
        './run.sh',
    ];

    const params: RunInstancesRequest = {
        ImageId: config.input.ec2ImageId,
        InstanceType: config.input.ec2InstanceType,
        MinCount: 1,
        MaxCount: 1,
        UserData: Buffer.from(userData.join('\n')).toString('base64'),
        SubnetId: config.input.subnetId,
        SecurityGroupIds: [config.input.securityGroupId],
        IamInstanceProfile: { Name: config.input.iamRoleName },
        TagSpecifications: config.tagSpecifications,
        InstanceInitiatedShutdownBehavior: "terminate"
    };

    try {
        const result = await ec2.runInstances(params).promise();
        const ec2InstanceId = result.Instances[0].InstanceId;
        core.info(`AWS EC2 instance ${ec2InstanceId} is started`);

        return ec2InstanceId;
    }
    catch (error) {
        core.error('AWS EC2 instance starting error');
        throw error;
    }
}

export async function terminateEc2Instance() {
    const ec2 = new EC2();

    const params = {
        InstanceIds: [config.input.ec2InstanceId],
    };

    try {
        await ec2.terminateInstances(params).promise();
        core.info(`AWS EC2 instance ${config.input.ec2InstanceId} is terminated`);
    }
    catch (error) {
        core.error(`AWS EC2 instance ${config.input.ec2InstanceId} termination error`);
        throw error;
    }
}

export async function waitForInstanceRunning(instanceId: InstanceId) {
    const ec2 = new EC2();

    const params = {
        InstanceIds: [instanceId],
    };

    try {
        await ec2.waitFor('instanceRunning', params).promise();
        core.info(`AWS EC2 instance ${instanceId} is up and running`);
    } catch (error) {
        core.error(`AWS EC2 instance ${instanceId} initialization error`);
        throw error;
    }
}

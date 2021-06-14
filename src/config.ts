import * as core from '@actions/core';
import {ImageId, InstanceType, SubnetId, SecurityGroupId} from 'aws-sdk/clients/ec2';
import {InstanceId, TagSpecificationList} from 'aws-sdk/clients/ec2';

type ConfigOptions = {
    mode: string;
    ec2ImageId: ImageId;
    ec2InstanceType: InstanceType;
    subnetId?: SubnetId;
    securityGroupId?: SecurityGroupId;
    label?: string;
    ec2InstanceId?: InstanceId;
    iamRoleName?: string;
}

class Config {

    public input: ConfigOptions;
    public tagSpecifications: TagSpecificationList;

    constructor() {
        this.input = {
            mode: core.getInput('mode'),
            ec2ImageId: core.getInput('ec2-image-id'),
            ec2InstanceType: core.getInput('ec2-instance-type'),
            subnetId: core.getInput('subnet-id'),
            securityGroupId: core.getInput('security-group-id'),
            label: core.getInput('label'),
            ec2InstanceId: core.getInput('ec2-instance-id'),
            iamRoleName: core.getInput('iam-role-name'),
        };

        const tags = JSON.parse(core.getInput('aws-resource-tags'));
        this.tagSpecifications = null;
        if (tags.length > 0) {
            this.tagSpecifications = [{ResourceType: 'instance', Tags: tags}, {ResourceType: 'volume', Tags: tags}];
        }

        //
        // validate input
        //

        if (!this.input.mode) {
            throw new Error(`The 'mode' input is not specified`);
        }

        if (this.input.mode === 'start') {
            if (!this.input.ec2ImageId || !this.input.ec2InstanceType || !this.input.subnetId || !this.input.securityGroupId) {
                throw new Error(`Not all the required inputs are provided for the 'start' mode`);
            }
        }
        else if (this.input.mode === 'stop') {
            if (!this.input.label || !this.input.ec2InstanceId) {
                throw new Error(`Not all the required inputs are provided for the 'stop' mode`);
            }
        } else {
            throw new Error('Wrong mode. Allowed values: start, stop.');
        }
    }

  generateUniqueLabel() {
    return Math.random().toString(36).substr(2, 5);
  }
}

try {
  module.exports = new Config();
} catch (error) {
  core.error(error);
  core.setFailed(error.message);
}

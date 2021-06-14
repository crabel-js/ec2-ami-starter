import * as core from '@actions/core';
import * as github from '@actions/github';
import * as _ from 'lodash';
import {config} from './config';


// get GitHub Registration Token for registering a self-hosted runner
export async function getRegistrationToken(): Promise<string> {
    const octokit = github.getOctokit(config.input.githubToken);

    try {
        const response = await octokit.request('POST /repos/{owner}/{repo}/actions/runners/registration-token', config.githubContext);
        core.info('GitHub Registration Token is received');
        return response.data.token;
    } catch (error) {
        core.error('GitHub Registration Token receiving error');
        throw error;
    }
}

export async function removeRunner(): Promise<void> {
    const runner = await getRunner(config.input.label);
    const octokit = github.getOctokit(config.input.githubToken);

    // skip the runner removal process if the runner is not found
    if (!runner) {
        core.info(`GitHub self-hosted runner with label ${config.input.label} is not found, so the removal is skipped`);
        return;
    }

    try {
        await octokit.request('DELETE /repos/{owner}/{repo}/actions/runners/{runner_id}', _.merge(config.githubContext, { runner_id: runner.id }));
        core.info(`GitHub self-hosted runner ${runner.name} is removed`);
        return;
    } catch (error) {
        core.error('GitHub self-hosted runner removal error');
        throw error;
    }
}

export async function waitForRunnerRegistered(label): Promise<void> {
    const timeoutMinutes = 5;
    const retryIntervalSeconds = 10;
    const quietPeriodSeconds = 30;
    let waitSeconds = 0;

    core.info(`Waiting ${quietPeriodSeconds}s for the AWS EC2 instance to be registered in GitHub as a new self-hosted runner`);
    await new Promise(r => setTimeout(r, quietPeriodSeconds * 1000));
    core.info(`Checking every ${retryIntervalSeconds}s if the GitHub self-hosted runner is registered`);

    return new Promise<void>((resolve, reject) => {
        const interval = setInterval(async () => {
            const runner = await getRunner(label);

            if (waitSeconds > timeoutMinutes * 60) {
                core.error('GitHub self-hosted runner registration error');
                clearInterval(interval);
                reject(`A timeout of ${timeoutMinutes} minutes is exceeded. Your AWS EC2 instance was not able to register itself in GitHub as a new self-hosted runner.`);
            }

            if (runner && runner.status === 'online') {
                core.info(`GitHub self-hosted runner ${runner.name} is registered and ready to use`);
                clearInterval(interval);
                resolve();
            } else {
                waitSeconds += retryIntervalSeconds;
                core.info('Checking...');
            }
        }, retryIntervalSeconds * 1000);
    });
}

//

// use the unique label to find the runner
// as we don't have the runner's id, it's not possible to get it in any other way
async function getRunner(label) {
    const octokit = github.getOctokit(config.input.githubToken);

    try {
        const response = await octokit.request('GET /repos/{owner}/{repo}/actions/runners', config.githubContext);
        const foundRunners = _.filter(response.data.runners, { labels: [{ name: label }] });
        return foundRunners.length > 0 ? foundRunners[0] : null;
    } catch (error) {
        return null;
    }
}

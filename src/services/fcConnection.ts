import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import { operatingSystem, dxService, FCConnectionService } from '.';

export interface FCOauth {
    username?: string,
    loginUrl?: string,
    id?: string,
    userId?: string,
    accessToken?: string,
    instanceUrl?: string,
    refreshToken?: string,
    orgId?: string,
    clientId?: string,
    connectedStatus?: string,
}

export class FCConnection extends vscode.TreeItem {
    private readonly parent: FCConnectionService;
    private limInterval;
    private prevLimits: number = 0;
    public readonly sfdxPath: string;
    public connection: any;
    public orgInfo: FCOauth;

    constructor(parent: FCConnectionService, orgInfo: FCOauth) {
        super(
            orgInfo.username,
            vscode.TreeItemCollapsibleState.None
        );

        this.parent = parent;
        this.orgInfo = orgInfo;
        this.sfdxPath = path.join(operatingSystem.getHomeDir(), '.sfdx', orgInfo.username + '.json');
        this.showLimitsService(this);
    }

    public isLoggedIn(): boolean {
        return fs.existsSync(this.sfdxPath);
    }

    public disconnect(): Promise<any> {
        if(this.isLoggedIn()) {
            if (this.limInterval) {
                clearInterval(this.limInterval);
            }
            return dxService.logout().then(() => {
                this.parent.currentConnection = undefined;
                return this.parent.refreshConnections();
            });
        }
    }

    public showConnection() {
        if (this.parent.currentConnection && this.parent.currentConnection.orgInfo && this.parent.currentConnection.orgInfo.username === this.orgInfo.username) {
            vscode.commands.executeCommand('setContext', 'ForceCodeLoggedIn', true);
            this.iconPath = {
                dark: path.join(__filename, '..', '..', '..', '..', 'images', 'greenCircleFilled.svg'),
                light: path.join(__filename, '..', '..', '..', '..', 'images', 'greenCircleFilled.svg'),
            }
        } else if (fs.existsSync(this.sfdxPath)) {
            this.command = {
                command: 'ForceCode.switchUser',
                title: '',
                arguments: [this.orgInfo]
            }
            this.iconPath = {
                dark: path.join(__filename, '..', '..', '..', '..', 'images', 'greenCircle.svg'),
                light: path.join(__filename, '..', '..', '..', '..', 'images', 'greenCircle.svg'),
            }
        } else {
            this.command = {
                command: 'ForceCode.login',
                title: '',
                arguments: [this.orgInfo]
            }
            this.iconPath = {
                dark: path.join(__filename, '..', '..', '..', '..', 'images', 'yellowCircle.svg'),
                light: path.join(__filename, '..', '..', '..', '..', 'images', 'yellowCircle.svg'),
            }
        }
        this.showLimits(this);
    }

    private showLimitsService(service: FCConnection) {
        if (service.limInterval) {
            clearInterval(service.limInterval);
        }
        service.limInterval = setInterval(function (service: FCConnection) {
            service.showLimits(service);
        }, 5000, service);
    }

    private showLimits(service: FCConnection) {
        service.tooltip = (service.parent.currentConnection && service.parent.currentConnection.orgInfo.username === service.orgInfo.username 
            ? 'Current username' : 'Click to switch to ' + service.orgInfo.username);
        if (service.connection
            && service.connection.limitInfo
            && service.connection.limitInfo.apiUsage
            && service.prevLimits !== service.connection.limitInfo.apiUsage.used) {

            service.prevLimits = service.connection.limitInfo.apiUsage.used;
            service.tooltip += ' - Limits: ' + service.prevLimits 
                + ' / ' + service.connection.limitInfo.apiUsage.limit;
        }
        service.tooltip += '\nPROJECT PATH - ' + service.parent.getSrcByUsername(service.orgInfo.username);
        service.parent.refreshView();
    }
}
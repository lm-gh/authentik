import "#admin/users/ServiceAccountForm";
import "#admin/users/UserForm";
import "#components/ak-hidden-text-input";
import "#components/ak-text-input";
import "#elements/wizard/FormWizardPage";
import "#elements/wizard/TypeCreateWizardPage";
import "#elements/wizard/Wizard";

import { AKElement } from "#elements/Base";
import { WizardPage } from "#elements/wizard/WizardPage";
import type { Wizard } from "#elements/wizard/Wizard";

import { TypeCreate, UserServiceAccountResponse, UserTypeEnum } from "@goauthentik/api";

import { msg } from "@lit/localize";
import { CSSResult, html, TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators.js";

import PFButton from "@patternfly/patternfly/components/Button/button.css";
import PFForm from "@patternfly/patternfly/components/Form/form.css";

const SERVICE_ACCOUNT_FORM_SLOT = `type-ak-user-service-account-form-${UserTypeEnum.ServiceAccount}`;
const SERVICE_ACCOUNT_RESULT_SLOT = "service-account-result";

const userTypes: TypeCreate[] = [
    {
        component: "ak-user-form",
        modelName: UserTypeEnum.Internal,
        name: msg("Internal"),
        description: msg("Company employees with access to the full enterprise feature set."),
    },
    {
        component: "ak-user-form",
        modelName: UserTypeEnum.External,
        name: msg("External"),
        description: msg(
            "External consultants or B2C customers without access to enterprise features.",
        ),
    },
    {
        component: "ak-user-service-account-form",
        modelName: UserTypeEnum.ServiceAccount,
        name: msg("Service Account"),
        description: msg("Machine-to-machine authentication or other automations."),
    },
];

@customElement("ak-user-service-account-result-page")
export class ServiceAccountResultPage extends WizardPage {
    public override label = msg("Retrieve Credentials");

    static styles: CSSResult[] = [PFForm];

    public override activeCallback = async (): Promise<void> => {
        this.host.isValid = true;
    };

    public override nextCallback = async (): Promise<boolean> => true;

    render(): TemplateResult {
        const result = this.host.state[SERVICE_ACCOUNT_FORM_SLOT] as
            | UserServiceAccountResponse
            | undefined;

        if (!result) {
            return html``;
        }

        return html`
            <p class="pf-c-form__helper-text">
                ${msg(
                    "Use the username and password below to authenticate. The password can be retrieved later on the Tokens page.",
                )}
            </p>
            <form class="pf-c-form pf-m-horizontal">
                <ak-text-input
                    label=${msg("Username")}
                    value=${result.username}
                    input-hint="code"
                    readonly
                ></ak-text-input>
                <ak-hidden-text-input
                    label=${msg("Password")}
                    value="${result.token}"
                    input-hint="code"
                    readonly
                    .help=${msg(
                        "Valid for 360 days, after which the password will automatically rotate. You can copy the password from the Token List.",
                    )}
                ></ak-hidden-text-input>
            </form>
        `;
    }
}

@customElement("ak-user-wizard")
export class UserWizard extends AKElement {
    static styles: CSSResult[] = [PFButton];

    @property()
    createText = msg("New User");

    @property()
    defaultPath: string = "users";

    @query("ak-wizard")
    wizard?: Wizard;

    selectListener = ({ detail }: CustomEvent<TypeCreate>) => {
        if (!this.wizard) return;

        const { component, modelName } = detail;
        const isServiceAccount = modelName === UserTypeEnum.ServiceAccount;

        this.wizard.steps = isServiceAccount
            ? ["initial", SERVICE_ACCOUNT_FORM_SLOT, SERVICE_ACCOUNT_RESULT_SLOT]
            : ["initial", `type-${component}-${modelName}`];

        this.wizard.isValid = true;
    };

    render(): TemplateResult {
        return html`
            <ak-wizard
                .steps=${["initial"]}
                header=${msg("New user")}
                description=${msg("Create a new user.")}
            >
                <ak-wizard-page-type-create
                    slot="initial"
                    .types=${userTypes}
                    @select=${this.selectListener}
                >
                </ak-wizard-page-type-create>

                <ak-wizard-page-form
                    slot=${`type-ak-user-form-${UserTypeEnum.Internal}`}
                    label=${msg("Create Internal User")}
                >
                    <ak-user-form
                        .userType=${UserTypeEnum.Internal}
                        defaultPath=${this.defaultPath}
                    ></ak-user-form>
                </ak-wizard-page-form>

                <ak-wizard-page-form
                    slot=${`type-ak-user-form-${UserTypeEnum.External}`}
                    label=${msg("Create External User")}
                >
                    <ak-user-form
                        .userType=${UserTypeEnum.External}
                        defaultPath=${this.defaultPath}
                    ></ak-user-form>
                </ak-wizard-page-form>

                <ak-wizard-page-form
                    slot=${SERVICE_ACCOUNT_FORM_SLOT}
                    label=${msg("Create Service Account")}
                >
                    <ak-user-service-account-form></ak-user-service-account-form>
                </ak-wizard-page-form>

                <ak-user-service-account-result-page
                    slot=${SERVICE_ACCOUNT_RESULT_SLOT}
                ></ak-user-service-account-result-page>

                <button slot="trigger" class="pf-c-button pf-m-primary">${this.createText}</button>
            </ak-wizard>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "ak-user-wizard": UserWizard;
        "ak-user-service-account-result-page": ServiceAccountResultPage;
    }
}

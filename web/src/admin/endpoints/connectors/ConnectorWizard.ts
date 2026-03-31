import "#elements/LicenseNotice";
import "#admin/endpoints/connectors/agent/AgentConnectorForm";
import "#admin/endpoints/connectors/fleet/FleetConnectorForm";
import "#admin/endpoints/connectors/gdtc/GoogleChromeConnectorForm";
import "#elements/wizard/FormWizardPage";
import "#elements/wizard/TypeCreateWizardPage";
import "#elements/wizard/Wizard";

import { DEFAULT_CONFIG } from "#common/api/config";

import { AKModal } from "#elements/dialogs/ak-modal";
import { SlottedTemplateResult } from "#elements/types";
import { StrictUnsafe } from "#elements/utils/unsafe";
import { TypeCreateWizardPageLayouts } from "#elements/wizard/TypeCreateWizardPage";
import { Wizard } from "#elements/wizard/Wizard";

import { EndpointsApi, TypeCreate } from "@goauthentik/api";

import { msg, str } from "@lit/localize";
import { customElement } from "@lit/reactive-element/decorators/custom-element.js";
import { html, PropertyValues } from "lit";
import { createRef, ref } from "lit-html/directives/ref.js";
import { property } from "lit/decorators.js";

@customElement("ak-endpoint-connector-wizard")
export class EndpointConnectorWizard extends AKModal {
    #api = new EndpointsApi(DEFAULT_CONFIG);

    public static override formatARIALabel = () => msg("Endpoint Connector Creation Wizard");

    @property({ attribute: false })
    public connectorTypes: TypeCreate[] | null = null;

    protected wizardRef = createRef<Wizard>();

    public get wizard(): Wizard | null {
        return this.wizardRef.value || null;
    }
    public override firstUpdated(changedProperties: PropertyValues<this>): void {
        super.firstUpdated(changedProperties);

        this.refresh();
    }

    public async refresh(): Promise<void> {
        return this.#api.endpointsConnectorsTypesList().then((types) => {
            this.connectorTypes = types;
        });
    }

    protected initialSteps = ["initial"];

    protected typeSelectListener = (ev: CustomEvent<TypeCreate>) => {
        const { wizard } = this;

        if (!wizard) return;

        const idx = wizard.steps.indexOf("initial") + 1;
        // Exclude all current steps starting with type-,
        // this happens when the user selects a type and then goes back
        wizard.steps = wizard.steps.filter((step) => !step.startsWith("type-"));
        wizard.steps.splice(idx, 0, `type-${ev.detail.component}-${ev.detail.modelName}`);
        wizard.isValid = true;
    };

    protected override renderCloseButton(): SlottedTemplateResult {
        return null;
    }

    protected override render(): SlottedTemplateResult {
        return html`
            <ak-wizard
                ${ref(this.wizardRef)}
                .steps=${this.initialSteps}
                header=${msg("New connector")}
                description=${msg("Create a new connector.")}
            >
                <ak-wizard-page-type-create
                    slot="initial"
                    .types=${this.connectorTypes}
                    layout=${TypeCreateWizardPageLayouts.grid}
                    @select=${this.typeSelectListener}
                >
                    <div slot="above-form">
                        <p>
                            ${msg(
                                "Connectors are required to create devices. Depending on connector type, agents either directly talk to them or they talk to and external API to create devices.",
                            )}
                        </p>
                    </div>
                </ak-wizard-page-type-create>
                ${this.renderConnectorForms()}
            </ak-wizard>
        `;
    }

    protected renderConnectorForms(): SlottedTemplateResult {
        if (!this.connectorTypes) {
            return null;
        }

        return this.connectorTypes.map((type) => {
            return html`<ak-wizard-page-form
                slot=${`type-${type.component}-${type.modelName}`}
                label=${msg(str`Create ${type.name}`)}
            >
                ${StrictUnsafe(type.component)}
            </ak-wizard-page-form>`;
        });
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "ak-endpoint-connector-wizard": EndpointConnectorWizard;
    }
}

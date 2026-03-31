import "#elements/LicenseNotice";
import "#admin/providers/ldap/LDAPProviderForm";
import "#admin/providers/oauth2/OAuth2ProviderForm";
import "#admin/providers/proxy/ProxyProviderForm";
import "#admin/providers/saml/SAMLProviderForm";
import "#admin/providers/saml/SAMLProviderImportForm";
import "#elements/wizard/FormWizardPage";
import "#elements/wizard/TypeCreateWizardPage";
import "#elements/wizard/Wizard";

import { DEFAULT_CONFIG } from "#common/api/config";

import { AKModal } from "#elements/dialogs/ak-modal";
import { SlottedTemplateResult } from "#elements/types";
import { StrictUnsafe } from "#elements/utils/unsafe";
import { TypeCreateWizardPageLayouts } from "#elements/wizard/TypeCreateWizardPage";
import type { Wizard } from "#elements/wizard/Wizard";

import { ProvidersApi, TypeCreate } from "@goauthentik/api";

import { msg, str } from "@lit/localize";
import { customElement } from "@lit/reactive-element/decorators/custom-element.js";
import { html, PropertyValues } from "lit";
import { createRef, ref } from "lit-html/directives/ref.js";
import { property } from "lit/decorators.js";

@customElement("ak-provider-wizard")
export class AKProviderWizard extends AKModal {
    public static override formatARIALabel = () => msg("Provider Creation Wizard");

    @property({ attribute: false })
    public providerTypes: TypeCreate[] = [];

    @property({ attribute: false })
    public finalHandler?: () => Promise<void>;

    protected wizardRef = createRef<Wizard>();

    public get wizard(): Wizard | null {
        return this.wizardRef.value || null;
    }

    public override firstUpdated(changedProperties: PropertyValues<this>): void {
        super.firstUpdated(changedProperties);

        new ProvidersApi(DEFAULT_CONFIG).providersAllTypesList().then((providerTypes) => {
            this.providerTypes = providerTypes;
        });
    }

    protected initialSteps = ["initial"];

    protected typeSelectListener = (ev: CustomEvent<TypeCreate>) => {
        const { wizard } = this;

        if (!wizard) return;

        wizard.steps = ["initial", `type-${ev.detail.component}`];
        wizard.isValid = true;
    };

    protected override renderCloseButton(): SlottedTemplateResult {
        return null;
    }

    protected override render(): SlottedTemplateResult {
        return html`<ak-wizard
            ${ref(this.wizardRef)}
            .steps=${this.initialSteps}
            header=${msg("New provider")}
            description=${msg("Create a new provider.")}
            .finalHandler=${this.finalHandler}
        >
            <ak-wizard-page-type-create
                slot="initial"
                layout=${TypeCreateWizardPageLayouts.grid}
                .types=${this.providerTypes}
                @select=${this.typeSelectListener}
            >
            </ak-wizard-page-type-create>
            ${this.providerTypes.map((type) => {
                return html`<ak-wizard-page-form
                    slot=${`type-${type.component}`}
                    label=${msg(str`Create ${type.name}`)}
                >
                    ${StrictUnsafe(type.component)}
                </ak-wizard-page-form>`;
            })}</ak-wizard
        >`;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "ak-provider-wizard": AKProviderWizard;
    }
}

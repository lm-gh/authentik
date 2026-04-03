import "#admin/policies/dummy/DummyPolicyForm";
import "#admin/policies/event_matcher/EventMatcherPolicyForm";
import "#admin/policies/expiry/ExpiryPolicyForm";
import "#admin/policies/expression/ExpressionPolicyForm";
import "#admin/policies/geoip/GeoIPPolicyForm";
import "#admin/policies/password/PasswordPolicyForm";
import "#admin/policies/reputation/ReputationPolicyForm";
import "#admin/policies/unique_password/UniquePasswordPolicyForm";
import "#elements/wizard/FormWizardPage";
import "#elements/wizard/TypeCreateWizardPage";
import "#elements/wizard/Wizard";

import { DEFAULT_CONFIG } from "#common/api/config";

import { SlottedTemplateResult } from "#elements/types";
import { AKCreationWizard } from "#elements/wizard/ak-creation-wizard";
import { FormWizardPage } from "#elements/wizard/FormWizardPage";
import { TypeCreateWizardPageLayouts } from "#elements/wizard/TypeCreateWizardPage";

import { PolicyBindingForm } from "#admin/policies/PolicyBindingForm";

import { PoliciesApi, Policy, PolicyBinding, TypeCreate } from "@goauthentik/api";

import { msg } from "@lit/localize";
import { customElement } from "@lit/reactive-element/decorators/custom-element.js";
import { html, PropertyValues } from "lit";
import { property } from "lit/decorators.js";

@customElement("ak-policy-wizard")
export class AKPolicyWizard extends AKCreationWizard {
    #api = new PoliciesApi(DEFAULT_CONFIG);

    @property({ type: Boolean })
    public showBindingPage = false;

    @property()
    public bindingTarget?: string;

    public override initialSteps = this.showBindingPage
        ? ["initial", "create-binding"]
        : ["initial"];

    public override entitySingular = msg("Policy");
    public override entityPlural = msg("Policies");

    public override layout = TypeCreateWizardPageLayouts.list;

    protected apiEndpoint = async (requestInit?: RequestInit): Promise<TypeCreate[]> => {
        return this.#api.policiesAllTypesList(requestInit);
    };

    protected updated(changedProperties: PropertyValues<this>): void {
        super.updated(changedProperties);

        if (changedProperties.has("showBindingPage")) {
            this.initialSteps = this.showBindingPage ? ["initial", "create-binding"] : ["initial"];
        }
    }

    protected renderForms(): SlottedTemplateResult {
        const bindingPage = this.showBindingPage
            ? html`<ak-wizard-page-form
                  slot="create-binding"
                  label=${msg("Create Binding")}
                  part="page-form"
                  .activePageCallback=${async (context: FormWizardPage) => {
                      const createSlot = context.host.steps[1];
                      const bindingForm =
                          context.querySelector<PolicyBindingForm>("ak-policy-binding-form");
                      if (!bindingForm) return;

                      bindingForm.instance = {
                          policy: (context.host.state[createSlot] as Policy).pk,
                      } as PolicyBinding;
                  }}
              >
                  <ak-policy-binding-form
                      .targetPk=${this.bindingTarget}
                      part="page-form"
                  ></ak-policy-binding-form>
              </ak-wizard-page-form>`
            : null;

        return [super.renderForms(), bindingPage];
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "ak-policy-wizard": AKPolicyWizard;
    }
}

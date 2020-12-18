import { ref, Ref, computed } from "@vue/composition-api";
import { Product } from "@shopware-pwa/commons/interfaces/models/content/product/Product";
import { PropertyGroup } from "@shopware-pwa/commons/interfaces/models/content/property/PropertyGroup";
import { useCms } from "@shopware-pwa/composables";
import { ApplicationVueContext, getApplicationContext } from "../appContext";
import { invokePost, endpoints } from "@shopware-pwa/shopware-6-client";
/**
 * interface for {@link useProductConfigurator} composable
 * @beta
 */
export interface IUseProductConfigurator {
  /**
   * Handler for action when the selected option is changed
   */
  handleChange: (
    attribute: string,
    option: string,
    onChangeHandled?: Function
  ) => Promise<void>;

  findVariantForSelectedOptions: (options?: {
    [key: string]: string;
  }) => Promise<void>;
  /**
   * Indicates if the options are being (re)loaded
   */
  isLoadingOptions: Ref<boolean>;
  /**
   * Object of currently selected options
   * e.g. {
   *    color: "red-color-option-id"
   * }
   */
  getSelectedOptions: Ref<{
    [key: string]: string;
  }>;
  /**
   * All assigned properties which the variant can be made of
   */
  getOptionGroups: Ref<PropertyGroup[]>;
}

/**
 * Product options - {@link IUseAddToCart}
 * @beta
 */
export const useProductConfigurator = (
  rootContext: ApplicationVueContext,
  product: Product
): IUseProductConfigurator => {
  const { page } = useCms(rootContext);
  const selected = ref({});
  const isLoadingOptions = ref(!!product.options?.length);
  const parentProductId = computed(() => product.parentId);
  const getOptionGroups = computed(() => page.value.configurator || []);
  const findVariantForSelectedOptions = async (options?: {
    [code: string]: string;
  }) => {
    const { apiInstance } = getApplicationContext(
      rootContext,
      "useProductConfigurator"
    );
    const filter = [
      {
        type: "equals",
        field: "parentId",
        value: parentProductId.value,
      },
      ...Object.values(options || selected.value).map((id) => ({
        type: "equals",
        field: "optionIds",
        value: id,
      })),
    ];
    try {
      /* istanbul ignore next */
      if (apiInstance) {
        apiInstance.defaults.headers["sw-include-seo-urls"] = true;
      }
      const response = await invokePost(
        {
          address: endpoints.getProductEndpoint(),
          payload: {
            limit: 1,
            filter,
            includes: {
              product: ["id", "translated", "productNumber", "seoUrls"],
              seo_url: ["seoPathInfo"],
            },
            associations: {
              seoUrls: {},
            },
          },
        },
        apiInstance
      );
      return response?.data?.data?.[0]; // return first matching product
    } catch (e) {
      console.error("SwProductDetails:findVariantForSelectedOptions", e);
    }
  };

  const handleChange = async (
    group: string,
    option: string,
    onChangeHandled?: Function
  ): Promise<void> => {
    selected.value = Object.assign({}, selected.value, {
      [group]: option,
    });
    if (typeof onChangeHandled === "function") {
      // run passed callback
      await onChangeHandled();
    }
  };

  return {
    handleChange,
    findVariantForSelectedOptions,
    isLoadingOptions,
    getOptionGroups,
    getSelectedOptions: selected,
  };
};
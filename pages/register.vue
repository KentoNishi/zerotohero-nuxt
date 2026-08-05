<template>
  <div
    :style="`min-height: 100vh; ${
      backgroundImage
        ? 'background-image: url(' +
          backgroundImage +
          '); background-size: cover; background-position: center;'
        : ''
    }`"
  >
    <div class="container">
      <div class="row">
        <div class="col-sm-12 pt-5">
          <div class="login-page">
            <div class="text-center mb-4">
              <Logo skin="light" />
            </div>
            <b-form @submit.prevent="onSubmit" v-if="show && !registrationDisabled">
              <div class="d-flex mb-3" style="gap: 0.5rem">
                <b-form-input
                  id="first_name"
                  v-model="form.first_name"
                  type="text"
                  :placeholder="$tb('First Name')"
                  required
                  style="flex: 1"
                ></b-form-input>
                <b-form-input
                  id="last_name"
                  v-model="form.last_name"
                  type="text"
                  :placeholder="$tb('Last Name')"
                  required
                  :style="{
                    flex: 1,
                    order: ['ko', 'ja', 'zh'].includes($browserLanguage)
                      ? -1
                      : 1,
                  }"
                ></b-form-input>
              </div>
              <b-form-group id="input-group-1" label-for="email">
                <b-form-input
                  id="email"
                  v-model="form.email"
                  type="email"
                  :placeholder="$tb('Email')"
                  required
                ></b-form-input>
              </b-form-group>

              <b-form-group id="input-group-2" label-for="password">
                <b-form-input
                  id="password"
                  type="password"
                  v-model="form.password"
                  :placeholder="$tb('Password')"
                  required
                ></b-form-input>
              </b-form-group>

              <!-- How did you hear about us? (required acquisition survey) -->
              <b-form-group id="input-group-3" label-for="acquisition_source">
                <b-form-select
                  id="acquisition_source"
                  v-model="form.acquisition_source"
                  :options="translatedAcquisitionOptions"
                  required
                ></b-form-select>
              </b-form-group>
              <b-form-group
                v-if="form.acquisition_source === 'other'"
                id="input-group-4"
                label-for="acquisition_other"
              >
                <b-form-input
                  id="acquisition_other"
                  v-model="form.acquisition_details"
                  type="text"
                  :placeholder="$tb('Please specify')"
                  required
                ></b-form-input>
              </b-form-group>

              <b-button class="d-block w-100" type="submit" variant="success">
                <b-spinner small v-if="loading" />
                <span v-else>{{ $tb("Sign Up") }}</span>
              </b-button>
              <div class="mt-3 text-center">
                <router-link
                  :to="{
                    name: 'login',
                    query: { redirect: $route.query.redirect },
                  }"
                >
                  {{ $tb("I have an account, log me in.") }}
                  <i class="fas fa-chevron-right ml-1"></i>
                </router-link>
              </div>
            </b-form>
            <div v-else-if="registrationDisabled" class="text-center">
              <p class="text-white mb-3">
                {{ $tb("I have an account, log me in.") }}
              </p>
              <router-link
                :to="{
                  name: 'login',
                  query: { redirect: $route.query.redirect },
                }"
                class="btn btn-success"
              >
                {{ $tb("Login") }}
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { background, logError, PYTHON_SERVER } from "../lib/utils";

export default {
  data() {
    return {
      form: {
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        acquisition_source: null,
        acquisition_details: null,
        role: 3,
        status: "draft", // Set the status to draft to prevent the user from logging in until the email is verified
      },
      show: true,
      loading: false,
    };
  },
  computed: {
    backgroundImage() {
      return background(this.$l2);
    },
    registrationDisabled() {
      return process.env.classicRegistrationDisabled === true;
    },
    translatedAcquisitionOptions() {
      return [
        { value: null, text: this.$t('How did you hear about us?') },
        { value: 'word_of_mouth', text: this.$t('Word of Mouth') },
        { value: 'instagram', text: this.$t('Instagram') },
        { value: 'bilibili', text: this.$t('Bilibili') },
        { value: 'google_ads', text: this.$tb('Online Ads') },
        { value: 'hsk_courses', text: this.$t('HSK Courses') },
        { value: 'app_store', text: this.$t('App Store') },
        { value: 'google_play', text: this.$tb('Google Play') },
        { value: 'google_search', text: this.$t('Web Search') },
        { value: 'youtube', text: this.$t('YouTube') },
        { value: 'other', text: this.$t('Other (Please specify)') },
      ];
    },
  },
  methods: {
    async onSubmit(event) {
      try {
        this.loading = true;

        // Register through Flask → GoTrue (SPEC-039 5.7).
        const res = await axios.post(
          `${PYTHON_SERVER}auth/register`,
          {
            email: this.form.email,
            password: this.form.password,
            firstName: this.form.first_name,
            lastName: this.form.last_name,
          }
        );

        if (res && res.data && res.data.user) {
          // Required acquisition survey — persist the answer right after signup
          // (SPEC-042). Failure is logged but never blocks registration.
          const userId = res.data.user.id;
          if (userId && this.form.acquisition_source) {
            try {
              await this.$axios.post(`${PYTHON_SERVER}acquisition_survey`, {
                user_id: userId,
                acquisition_source: this.form.acquisition_source,
                acquisition_details:
                  this.form.acquisition_source === "other"
                    ? this.form.acquisition_details
                    : null,
              });
            } catch (err) {
              logError(err);
            }
          }

          // Redirect to Verification Instruction Screen
          this.$router.push({
            name: "verify-email",
            query: {
              // vue-router encodes query values itself; double-encoding here
              // produced URLs like ?email=test%2540example.com.
              email: this.form.email,
            },
          });
        }
      } catch (err) {
        this.loading = false;
        logError(err);

        // Handle errors and display appropriate error messages
        if (err.response && err.response.data) {
          const data = err.response.data;
          // Flask returns { errors: [{ code, message }] }; old Directus used
          // { error: { code, message } }. Accept both.
          const firstError = (data.errors && data.errors[0]) || data.error || {};
          let message = firstError.message || "There has been an error.";

          if (firstError.code === "rate_limited") {
            message = this.$tb("error.create_account_failed");
          } else if (firstError.code === "email_already_registered" || firstError.code === 204) {
            message = this.$tb(
              "Your email {email} has already been registered, please login.",
              { email: this.form.email }
            );
            this.$router.push({
              name: "login",
              params: {
                message,
              },
            });
          }

          this.$toast.error(message, {
            position: "top-center",
            duration: 5000,
          });
        } else {
          this.$toast.error("There has been an error.", {
            position: "top-center",
            duration: 5000,
          });
        }
      }
    },
  },
};
</script>
<style lang="scss" scoped>
.login-page {
  margin: 2rem auto 5rem auto;
  padding: 2rem;
  border-radius: 1rem;
  overflow: hidden;
  background: #ffffffbb;
  max-width: 20rem;
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.483);
  backdrop-filter: blur(20px);
}
</style>

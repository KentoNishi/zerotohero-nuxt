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
          <div :class="{ 'login-page': true, shaking }">
            <div class="text-center mb-4">
              <Logo skin="light" />
            </div>
            <b-form @submit.prevent="login">
              <div v-if="message" class="alert alert-danger mt-2">
                {{ $tb(message) }}
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

              <b-button class="d-block w-100" type="submit" variant="success">
                <b-spinner small v-if="loading" />
                <span v-else>{{ $tb("Login") }}</span>
              </b-button>
              <div class="mt-3 text-center">
                <router-link
                  :to="{
                    name: 'register',
                    query: { redirect: $route.query.redirect },
                  }"
                  >{{ $tb("Register") }}</router-link
                >&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                <router-link
                  :to="{
                    name: 'forgot-password',
                    query: { redirect: $route.query.redirect },
                  }"
                  >{{ $tb("Forgot Password?") }}</router-link
                >
              </div>
            </b-form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { background, timeout } from "../lib/utils";
export default {
  props: {
    message: String,
  },
  data() {
    return {
      form: {
        email: "",
        password: "",
      },
      shaking: false,
      loading: false,
    };
  },
  computed: {
    backgroundImage() {
      return background(this.$l2);
    },
  },
  mounted() {
    if (this.$auth.loggedIn) {
      this.redirect();
    }
  },
  methods: {
    redirect() {
      if (this.$route.query.redirect) {
        this.$router.push({ path: this.$route.query.redirect });
      } else {
        if (this.$l1 && this.$l2)
          this.$router.push({
            name: "l1-l2-profile",
            params: { l1: this.$l1.code, l2: this.$l2.code },
          });
        else this.$router.push("/dashboard");
      }
    },
    async login(event) {
      try {
        this.loading = true;
        let res = await this.$auth.loginWith("local", { data: this.form });
        if (res && res.data && res.data.data && res.data.data.user) {
          let user = res.data.data.user;
          this.$auth.setUser(user);
          await this.$store.dispatch(
            "subscriptions/checkSubscription",
            this.$auth.user.id
          );
          // Fetch or create user data
          await this.$directus.fetchOrCreateUserData(); 

          this.$gtag.event(
            "login",
            this.$auth.user.id
              ? {
                  method: this.$auth.user.provider,
                  user_id: this.$auth.user.id,
                }
              : {
                  method: "anonymous",
                }
          );
          
          this.$toast.success(
            this.$tb("Welcome back, {name}!", {
              name: this.$auth.user.first_name,
            }),
            {
              position: "top-center",
              duration: 5000,
            }
          );
          this.redirect();
        }
      } catch (err) {
        if (err.response && err.response.data) {
          if (err.response.data.error.code === 103) {
            // User's status is not 'active'. Ask the user to verify their email.
            this.$router.push({
              name: "verify-email",
              query: {
                email: encodeURIComponent(this.form.email),
              },
            });
          } else {
            this.$toast.error(err.response.data.error.message, {
              position: "top-center",
              duration: 5000,
            });
          }
        } else {
          this.$toast.error(
            this.$tb("There has been an error."),
            {
              position: "top-center",
              duration: 5000,
            }
          );
        }
        this.loading = false;
        this.shake();
      }
    },
    async shake() {
      this.shaking = true;
      await timeout(500);
      this.shaking = false;
    },
  },
};
</script>
<style lang="scss" scoped>
.login-page {
  margin: 2rem auto 2rem auto;
  padding: 2rem;
  border-radius: 1rem;
  overflow: hidden;
  background: #ffffffbb;
  max-width: 20rem;
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.483);
  backdrop-filter: blur(20px);
}

.shaking {
  animation: shake 0.82s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  transform: translate3d(0, 0, 0);
  backface-visibility: hidden;
  perspective: 1000px;
  animation-iteration-count: infinite;
}

@keyframes shake {
  10%,
  90% {
    transform: translate3d(-1px, 0, 0);
  }

  20%,
  80% {
    transform: translate3d(2px, 0, 0);
  }

  30%,
  50%,
  70% {
    transform: translate3d(-4px, 0, 0);
  }

  40%,
  60% {
    transform: translate3d(4px, 0, 0);
  }
}
</style>

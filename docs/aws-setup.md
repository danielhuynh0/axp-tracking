# AWS setup and the next checkpoint

No AWS credentials are needed for `npm ci`, local tests, or static builds.
To deploy, configure an AWS CLI profile on your machine, preferably using IAM
Identity Center/SSO. Provide the profile name and preferred region to the coding
agent; do not paste access keys or passwords into chat.

AWS CLI is present in the current environment. SAM CLI is not. Install a current
SAM CLI before deployment. The GitHub workflow installs SAM for validation only;
it does not deploy and has no AWS credentials.

## Deployment sequence (not yet executed)

1. Authenticate your chosen profile (`aws sso login --profile <profile>` when using
   SSO). Verify `aws sts get-caller-identity --profile <profile>` identifies the
   intended account. Choose a region before creating resources.
2. Run `npm ci` and `npm run check` from the root.
3. Run `sam validate --lint --template-file infra/template.yaml --region <region>`.
4. Run `sam build --template-file infra/template.yaml`.
5. Run `sam deploy --guided --template-file .aws-sam/build/template.yaml
   --stack-name axp-dev --profile <profile> --region <region>
   --parameter-overrides Environment=dev --capabilities CAPABILITY_IAM`.
   The command is shown wrapped for readability; execute it as one command.
   SAM packages Lambda code and applies the CloudFormation change set. A sample
   `samconfig.example.toml` is supplied; real samconfig.toml is ignored by Git.
6. Read the stack outputs. Set the four public frontend values:

   | Frontend variable | Stack output |
   | --- | --- |
   | VITE_API_URL | ApiUrl |
   | VITE_COGNITO_ISSUER | CognitoIssuer |
   | VITE_COGNITO_CLIENT_ID | CognitoClientId |
   | VITE_COGNITO_DOMAIN | CognitoDomain |

7. Run `npm run build --workspace @axp/web` with those values present.
8. Upload `apps/web/dist/assets/` to the bucket's `assets/` prefix with
   `Cache-Control: public,max-age=31536000,immutable`. Upload index.html last with
   `Cache-Control: no-cache,max-age=0,must-revalidate`. Retain old hashed assets
   through the rollback window; do not immediately delete them on deploy.
9. Invalidate `/index.html`, `/`, and `/auth/callback` in CloudFront. The managed
   caching policy has a minimum TTL, so invalidation is part of publication.
10. Administratively create the intended Cognito user using the configured email
    address and the pool ID output. Keep passwords out of scripts and logs.

The future deployment script should automate steps 2–9, derive configuration from
stack outputs, stop on failures, verify account/region, and run an HTTP smoke test.
It should also retain build provenance for rollback. User creation is onboarding,
not a step to repeat on every deployment.

## Required deployed smoke tests

- Root page loads over HTTPS; `/auth/callback` serves the SPA and missing assets
  return an error rather than HTML.
- Real Cognito sign-in and sign-out complete. Registration is unavailable.
- Missing, expired, incorrectly scoped, and wrong-client tokens fail at the API.
- CORS preflight succeeds for the website and dev localhost; unrelated origins
  receive no allowed origin response.
- Preferences save, survive a page reload, and are isolated between two test users.
- Concurrent updates produce 409 instead of silently overwriting changes.
- Direct S3 object access is denied while CloudFront can serve the site.
- Production parameter settings exclude localhost and enable recovery protection.

Only after these tests pass should checkpoint 2 be marked complete. The next
domain checkpoint depends on the still-open AXP business rules.

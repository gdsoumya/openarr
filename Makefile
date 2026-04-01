export ANDROID_HOME ?= $(HOME)/Android/Sdk
export PATH := $(ANDROID_HOME)/platform-tools:$(PATH)

.PHONY: help prebuild dev android ios clean nuke test lint start

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

# ─── Setup ──────────────────────────────────────────────

install: ## Install dependencies
	npm install

prebuild: install ## Generate native Android/iOS projects
	npx expo prebuild
	@test -d android && echo "sdk.dir=$(ANDROID_HOME)" > android/local.properties || true

prebuild-android: install ## Generate native Android project only
	npx expo prebuild --platform android
	@echo "sdk.dir=$(ANDROID_HOME)" > android/local.properties

prebuild-ios: install ## Generate native iOS project only
	npx expo prebuild --platform ios

# ─── Development ────────────────────────────────────────

dev: ## Start Expo dev server
	npx expo start --dev-client

start: ## Start Expo dev server (alias)
	npx expo start --dev-client

android: prebuild-android ## Build and run debug on connected Android device
	npx expo run:android

android-release: prebuild-android ## Build signed release APK
	cd android && ./gradlew assembleRelease
	@echo ""
	@echo "✅ Signed release APK built at:"
	@ls -lh android/app/build/outputs/apk/release/app-release.apk 2>/dev/null || echo "   Check android/app/build/outputs/apk/release/"

android-bundle: prebuild-android ## Build signed release AAB (for Play Store)
	cd android && ./gradlew bundleRelease
	@echo ""
	@echo "✅ Signed release AAB built at:"
	@ls -lh android/app/build/outputs/bundle/release/app-release.aab 2>/dev/null || echo "   Check android/app/build/outputs/bundle/release/"

android-install: android-release ## Build release APK and install on device
	adb install -r android/app/build/outputs/apk/release/app-release.apk
	@echo "✅ Installed on device"

ios: prebuild-ios ## Build and run on iOS simulator
	npx expo run:ios

ios-device: prebuild-ios ## Build and run on connected iOS device
	npx expo run:ios --device

# ─── Testing ────────────────────────────────────────────

test: ## Run all tests
	npx jest --no-cache

test-watch: ## Run tests in watch mode
	npx jest --watch

test-coverage: ## Run tests with coverage report
	npx jest --coverage --no-cache

# ─── Quality ────────────────────────────────────────────

lint: ## Run linter
	npx expo lint

typecheck: ## Run TypeScript type checking
	npx tsc --noEmit

# ─── Cleanup ────────────────────────────────────────────

clean: ## Remove build artifacts
	rm -rf android/app/build
	rm -rf ios/build
	rm -rf .expo

nuke: ## Full clean — remove native projects and node_modules
	rm -rf android ios node_modules .expo
	npm install
	npx expo prebuild

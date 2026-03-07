pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

/*  This is a name you give to the root of your Gradle project.
    It's used by Gradle and Android Studio to label the project. For example, in Android
    Studio's project view, you'll see "My Application" as the name of the top-level project folder.

    It is NOT Used in Your App. This is not the name of your app that users see on their phones.
    It is purely for project organization during development.
*/
rootProject.name = "MemoTattoo"
include(":app")

# Changelog

All notable changes to `WP Curate` will be documented in this file.

## 2.0.2 - 2024-07-19

- Enhancement: Update Mantle Testkit to `v1.0.0`.
- Enhancement: Allow for unique pinned posts on pages with deduplication enabled.
- Bug Fix: Unit testing in Github Actions.

## 2.0.1 - 2024-07-18

- Bug Fix: Update block-editor-tools to prevent errors/block crashes related to the PostPicker.

## 2.0.0 - 2024-06-24

- Enhancement: Fire the `wp_curate_clear_history_post_ids` action to clear the history of post IDs that have used on the page and would be deduplicated from subsequent queries.
- Changed: Signatures for `Query_Block_Context` and `Recorded_Curated_Posts`.

## 1.10.0 - 2024-05-21

- Enhancement: Add `wp_curate_plugin_curated_post_query` filter for the arguments used for querying posts that match query block attributes.
- Enhancement: Add `wp_curate_rest_posts_query` filter for the arguments used for querying posts over the REST API for the query block editor preview.
- Enhancement: Make the ID of the post being edited available to `wp_curate_rest_posts_query` filter.

## 1.9.1 - 2024-04-25

- Bug Fix: Improve handling of default post types on the Query block.

## 1.9.0 - 2024-04-19

- Enhancement: Exclude current post in backfilled posts query.

## 1.8.2 - 2024-03-27

- Bug Fix: Error in 1.8.1 when Parse.ly is not instantiated.

## 1.8.1 - 2024-03-27

- Bug Fix: Query blocks set to ordery trending fatal when Parse.ly is not set up.

## 1.8.0 - 2024-03-19

- Enhancement: Integration with [WPGraphQL plugin](https://wordpress.org/plugins/wp-graphql/) to support custom GraphQL interface type and connection.

## 1.7.1 - 2024-03-13

- Bug Fix: Query block does not update with posts from custom post types when selected in Query Paramaters block settings.

## 1.7.0 - 2024-03-06

- Enhancement: Integration with [Parse.ly plugin](https://wordpress.org/plugins/wp-parsely/) to support querying trending posts.

## 1.6.3 - 2024-02-14

- Bug Fix: Selecting a post more than once in a Query block causes empty slots at the end.

## 1.6.2 - 2024-02-08

- Bug Fix: Add intentional spacing before PostPicker buttons.

## 1.6.1 - 2024-02-02

- Make nunomaduro/collision a dev dependency.
- Switch alleyinteractive/wp-type-extensions to tagged version.

## 1.6.0 - 2024-01-26

- Change GitHub actions back to PHP 8.1 so that sites are not required to run 8.2 yet.

## 1.5.1 - 2024-01-25

- Bug Fix: Avoid BlockControl toolbar obstructing PostPicker button when Post inner blocks are selected.

## 1.5.0 - 2023-12-13

- Enhancement: Bumps tested up to and requires WP to 6.4.

## 1.4.5 - 2023-12-12

- Bug fix: Adds support to Windows file path validation with `validate_file` function.

## 1.4.4 - 2023-12-04

- Bug fix: Update to the `Parsed_Block` new namespace.

## 1.4.3 - 2023-11-28

- Bug fix: Adds in a temporary fix for https://github.com/alleyinteractive/alley-scripts/issues/473
- Bug fix: Lock [nunomaduro/collision](https://github.com/nunomaduro/collision) at v6.0. Fixes failing tests via Github Actions.

## 1.4.2 - 2023-11-01

- Bug fix: PHP tax_query wants `AND` or `IN` for `operator`. REST API wants `AND` or `OR`.
- Default operator should be `OR`/`IN`.

## 1.4.1 - 2023-11-01

- Bug fix: allow blocks when no post type is defined.

## 1.4.0 - 2023-10-30

- Bug fix: prevents error if `termRelations` attribute is not set.

## 1.3.0 - 2023-10-26

- Only show the blocks and register the meta on supported post types.
- Supported post types defaults to all Block Editor post types, but can be filtered by filtering `wp_curate_supported_post_types`.

## 1.2.0 - 2023-10-26

- Adds support for AND/OR operators in the Query Parameters, giving more control over what posts to show.

## 1.1.0 - 2023-09-21

- Bug fix: prevents error if post type does not support meta.

## 1.0.0 - 2023-09-19

- Initial release

# Changelog

All notable changes to `WP Curate` will be documented in this file.

## 3.0.0

- Support for previews of Query block and Patterns.
- Pattern/Variation picker when inserting a Query block.
- Post blocks can now exist outside of Post Template blocks, allowing for more complex layouts
  and individual inner blocks on the Post block.
- Upgrade to PHPStan to 2.0.
- Added unit tests for existing plugin functionality.

## 2.7.2 - 2025-10-15

- Enhancement: Post Picker results filtered to match Query block parameters by default.
- Enhancement: Text alignment support in Post Title block.
- Bug fix: Fix issue where reducing number of posts caused some posts to be hidden in the editor.
- Bug fix: Fix PHP warnings.

## 2.7.1 - 2025-10-01

- Enhancement: Add option to "Pin This Post" so editors can pin the selected post.

## 2.7.0 - 2025-09-05

- Enhancement: Update wp-type-extensions to 4.0.0.

## 2.6.4 - 2025-08-29

- Enhancement: Add options to order by different post values and choose the sort direction.
    addresses https://github.com/alleyinteractive/wp-curate/issues/169 and https://github.com/alleyinteractive/wp-curate/issues/158

## 2.6.3 - 2025-07-17

- Bug Fix: Require Subquery block to have a parent Query block to prevent errors when used outside of a Query block.
- Bug Fix: Handle custom taxonomies that do not have a `rest_base` set.
- Enhancement: Display `No results found.` messages when not posts are found in the Query block.

## 2.6.2 - 2025-05-15

- Enhancement: Change priority for query block init to 900, to allow more time for registration of custom post types and taxonomies.

## 2.6.1 - 2025-04-09

- Bug Fix: Revert update to wp-type-extensions to avoid conflicts with the Alleyvate plugin.

## 2.6.0 - 2025-04-09

- Enhancement: Update wp-type-extensions to 4.0.0.

## 2.5.0 - 2025-03-18

- Enhancement: Update wp-type-extensions to 3.0.0.

## 2.4.11 - 2025-02-07

- Changed: Revert integration with Parsely 3.17 because of a fatal error.

## 2.4.10 - 2025-02-06

- Bug Fix: Fix integration with version 3.17 of the Parsely plugin.

## 2.4.9 - 2025-01-13

- Bug Fix: Allow manually resetting custom post title back to original title.

## 2.4.8 - 2024-12-17

- Bug Fix: Roll back to React 18 again.

## 2.4.7 - 2024-12-17

- Enhancement: Display a message if number of posts on subquery block is set to 0.

## 2.4.6 - 2024-12-11

- Bug Fix: Roll back to React 18.

## 2.4.5 - 2024-12-10

- Bug Fix: Prevent block transformation preview issues on WordPress 6.7.

## 2.4.4 - 2024-12-02

- Restore maxNumberOfPosts attribute with a default filterable value of maxPosts.

## 2.4.3 - 2024-11-18

- Enhancement: Post Title block (which allows title overrides for pinned posts) works in Subquery block.

## 2.4.2 - 2024-09-27

- Bug Fix: Posts not of type 'post' are flagged as being deleted.

## 2.4.1 - 2024-09-19

- Enhancement: Enable support for hiding post type selection from block settings UI.

## 2.4.0 - 2024-08-28

- Enhancement: Subquery block added to allow a separate set of posts within a query block.
see <https://github.com/alleyinteractive/wp-curate/issues/200>

## 2.3.3 - 2024-09-16

- Bug Fix: Hold space on the front end for curated posts that were deleted.

## 2.3.2 - 2024-09-09

- Bug Fix: Prevent block transforms from crashing the Query block.

## 2.3.1 - 2024-08-28

- Bug Fix: Backfill posts filling out of order in the Editor.

## 2.3.0 - 2024-08-28

- Enhancement: Enable block filter support for Post Title block setting Heading Level select.

## 2.2.3 - 2024-08-26

- Stack post buttons (move, pin, etc.) in smaller block widths.

## 2.2.2 - 2024-08-21

- Enhancement: Introduce `SWR` for caching API requests in the Query block.

## 2.2.1 - 2024-08-15

- Bug Fix: Handle cases where a pinned post has been deleted or unpublished.

## 2.2.0 - 2024-08-05

- Enhancement: Ability to customize the post title for a post that appears in a Query block.

## 2.1.0 - 2024-07-31

- Enhancement: Ability to move pinned posts by clicking the Move Post button, then clicking the destination block.

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

- Bug fix: Adds in a temporary fix for <https://github.com/alleyinteractive/alley-scripts/issues/473>
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

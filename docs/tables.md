| schema | relation_name        | relation_type | description                                                                                                       |
| ------ | -------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------- |
| public | ai_metadata          | table         | null                                                                                                              |
| public | feedback             | table         | null                                                                                                              |
| public | group_participants   | table         | null                                                                                                              |
| public | groups               | table         | Optional description of the group                                                                                 |
| public | groups               | table         | Unique 8-character invite code for joining the group                                                              |
| public | groups               | table         | Whether the group is publicly discoverable and joinable                                                           |
| public | messages             | table         | null                                                                                                              |
| public | paper_tags           | table         | null                                                                                                              |
| public | papers               | table         | arXiv categories (e.g., cs.AI, cs.LG)                                                                             |
| public | papers               | table         | Last updated timestamp from source (arXiv)                                                                        |
| public | papers               | table         | arXiv identifier (e.g., 2301.07041)                                                                               |
| public | papers               | table         | Direct URL to PDF file                                                                                            |
| public | papers_arxiv         | table         | arXiv papers storage table                                                                                        |
| public | session_papers       | table         | null                                                                                                              |
| public | session_participants | table         | null                                                                                                              |
| public | sessions             | table         | null                                                                                                              |
| public | user_presence        | table         | null                                                                                                              |
| public | users                | table         | User ID 0 is reserved for guest users. User ID 1 is reserved for AI user. Users with ID < 2 cannot create groups. |
| public | user_profiles        | view          | null                                                                                                              |
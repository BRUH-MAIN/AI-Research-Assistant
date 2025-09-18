I want you to now Finish the paper extraction part from arxiv the workflow it going to be like this

user enters name or tag -> search in postgres for that matching name or tag (use "like" for both(make all  lowercase)) 

show a load more button for user if clicked it will search arxiv with the keyword or tag and retrieve top 10 and as user asks for load more each time 10 paper metdata will be retrieved and stored and displayed, then the user can add the paper to an exsisting session or create a new session to add it or add it in current session if the search happens within the session or just read the paper
import FetchConstants from "../constants/fetchConstants"
import FetchStore from '../stores/fetchStore'
import { fetchSuccess, fetchError, nextPageSuccess } from "../actions/fetchActions"
import JavaFormatter from "../functions/javaFormatter"

export var sendRequest = function(action) {
    // update store with new request
    FetchStore.setCode(action.code)
    FetchStore.setType(action.type)
    FetchStore.setPage(0)
    FetchStore.setCounter(1)

    let typeArray = action.type.split(".")
    let pakage = action.type.substring(0, action.type.length - typeArray[typeArray.length - 1].length - 1)
    
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", FetchConstants.FETCH_URL);
    xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");

    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
            if (xmlhttp.status == 200) {
                let data = handleResponseSuccess(xmlhttp.responseText)
                fetchSuccess(data.results, data.page);
            } else if (xmlhttp.status == 400) {
                fetchError("Error 400 returned from server")
            } else {
                fetchError("Server Error: " + xmlhttp.status)
            }
        }
    };

    let data = {
        'package': pakage,
        'class': typeArray[typeArray.length - 1],
        'method': action.code,
        'page': action.page
    }

    xmlhttp.send(JSON.stringify(data));
}

export var fetchNextPage = function() {
    // get current request settings
    let code = FetchStore.getCode()
    let type = FetchStore.getType()
    let page = FetchStore.getPage()
    
    // increment page by 1
    page += 1
    
    if (FetchStore.getCounter() <= 0) {
        return
    }

    let typeArray = type.split(".")
    let pakage = type.substring(0, type.length - typeArray[typeArray.length - 1].length - 1)

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", FetchConstants.FETCH_URL);
    xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");

    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
            if (xmlhttp.status == 200) {
                let data = handleResponseSuccess(xmlhttp.responseText)
                nextPageSuccess(data.results, data.page)
            } else if (xmlhttp.status == 400) {
                fetchError("Error 400 returned from server")
            } else {
                fetchError("Server Error: " + xmlhttp.status)
            }
        }
    };

    let data = {
        'package': pakage,
        'class': typeArray[typeArray.length - 1],
        'method': code,
        'page': page
    }

    xmlhttp.send(JSON.stringify(data));
}

let handleResponseSuccess = function(responses) {
    let response = JSON.parse(responses);
    let responseArray = response.occurrences;

    let data = []
    let page = response.endPage
    let formatter = new JavaFormatter("   ")

    responseArray.forEach(item => {
        item.selections.forEach(selection => {
            let start = selection.start.line
            let end = selection.end.line

            let title = "Example " + FetchStore.getCounter() + " (Line " + start + ")"
            if (start !== end) {
                title = "Example " + FetchStore.getCounter() + " (Line " + start + "-" + end + ")"
            }

            try {
                let formattedCode = formatter.formatSnippet(item.code, start, end, FetchConstants.SPLIT_OFFSET);

                if (formattedCode[0].split('\n').length + formattedCode[1].split('\n').length
                    + formattedCode[2].split('\n').length >= FetchConstants.MIN_LINES) {
                    data.push({
                        title: title,
                        repoUrl: item.repoUrl,
                        fileUrl: item.fileUrl + "#L" + start,
                        codeTop: formattedCode[0],
                        codeHighlighted: formattedCode[1],
                        codeBottom: formattedCode[2]
                    })

                    FetchStore.setCounter(FetchStore.getCounter() + 1)
                }
            } catch (e) {
                console.log("Unable to format and add code: " + e)
            }
        })
    })
    
    return {
        results: data,
        page: page
    }
}
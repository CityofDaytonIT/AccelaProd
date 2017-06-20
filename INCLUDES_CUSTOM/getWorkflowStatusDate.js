function getWorkflowStatusDate(task, status) {
	statHistObj = aa.workflow.getHistory(capId)
	if (!statHistObj.getSuccess()) {
		logDebug("**Error could not retrieve Workflow History for record")
		return null
	}
	
	statHist = statHistObj.getOutput()
	for (i in statHist) {
		thisTask = statHist[i]
		if (""+thisTask.getTaskDescription() == task && ""+thisTask.getDisposition() == status) {
			return thisTask.getStatusDate()
		}
	}
	return null
}
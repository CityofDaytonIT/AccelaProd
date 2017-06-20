function closeOutWorkflow(pStatus,pComment) {
	var workflowResult = aa.workflow.getTasks(capId);
  	var wfObj = workflowResult.getOutput();
	
	var fTask;
	var stepnumber;
	var dispositionDate = aa.date.getCurrentDate();
	var wftask;
	
	var  isInspTask = false
	for (i in wfObj) {
		fTask = wfObj[i];
		wftask = fTask.getTaskDescription();
		stepnumber = fTask.getStepNumber();
		if (isInspTask && fTask.activeFlag == "Y" ){	//|| fTask.getDisposition() == "") {
			aa.workflow.handleDisposition(capId,stepnumber,pStatus,dispositionDate,pComment,pComment,systemUserObj,"Y");
			logMessage("Closing Workflow Task " + wftask + " with status " + pStatus);
			logDebug("Closing Workflow Task " + wftask + " with status " + pStatus);
		}
		else {
			deactivateTask(wftask)
		}
		if (matches(wftask,"Inspection","Inspections")) isInspTask = true

	}
}
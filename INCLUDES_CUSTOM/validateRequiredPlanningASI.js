function validateRequiredPlanningASI() {
	var requiredASIbyCaseType = []
	requiredASIbyCaseType["Planned Development"] = ["Public Hearing Ad Date","City Commission Action"]
	requiredASIbyCaseType["Area Wide Rezoning"] = ["Public Hearing Ad Date","City Commission Action"]
	requiredASIbyCaseType["Urban Renewal Plans"] = ["Public Hearing Ad Date","City Commission Action"]
	// requiredASIbyCaseType["Urban/Strategy/Policy"] = ["City Commission Action"] 			//Case Type doesn't exist........
	requiredASIbyCaseType["Zoning Code Text Amendment"] = ["Public Hearing Ad Date","City Commission Action"]
	
	var thisASIlist = requiredASIbyCaseType[""+AInfo["Case Type"]]
	if (typeof thisASIlist != "object") return true
	
	var reqsNotMet = []
	switch(""+wfTask) {
		case "Hearing Scheduled":
			if (matches(""+wfStatus, "Hearing Scheduled")) {
				for (i in thisASIlist) {
					if (matches(AInfo[thisASIlist[i]], null, "")) reqsNotMet.push(thisASIlist[i])
				}
			}
			break;
		case "Board Hearing":
			if (matches(""+wfStatus, "Approved with Conditions", "Approved", "Denied")) {
				for (i in thisASIlist) {
					if (matches(AInfo[thisASIlist[i]], null, "")) reqsNotMet.push(thisASIlist[i])
				}
			}
			break;
	}
	logDebug(reqsNotMet)
	if (reqsNotMet.length > 0) {
		showMessage = true
		logMessage("The Data Field"+ (reqsNotMet.length > 1? "s": "") + " <font color='red'>" + reqsNotMet.join("</font> and <font color='red'>") + "</font> " +(reqsNotMet.length > 1? "are": "is")+" required before updating the Workflow task "+wfTask+" to a status of "+wfStatus)
		cancel = true
	}
}
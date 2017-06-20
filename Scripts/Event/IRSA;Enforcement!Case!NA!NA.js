//script 51
if (inspType == "Initial Investigation") {
	if (inspResult  == "In Violation") {
		closeTask("Investigation", "In Violation", "Set by Script", "Set by Script")
		updateAppStatus("In Violation", "Set by Script")
		activateTask("Issue Notice")
	}
	else if (inspResult  == "No Violation") {
		closeTask("Investigation", "No Violation", "Set by Script", "Set by Script")
		updateAppStatus("Closed - No Violation", "Set by Script")
		deactivateTask("Issue Notice")
	}
	else if (inspResult  == "Violation Corrected") {
		closeTask("Investigation", "No Violation", "Set by Script", "Set by Script")
		updateAppStatus("Closed - No Violation", "Set by Script")
		deactivateTask("Issue Notice")
	}
}


//script52
try {
	origDesc = workDescGet(capId)
	today = new Date()
	if (inspComment != null) origDesc += "\r\n" + jsDateToASIDate(today) + " - " + inspComment 
	updateWorkDesc(origDesc)
} catch(err) {
	logDebug(err)
}

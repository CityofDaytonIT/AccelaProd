
//Script 44
if (allTasksComplete("H_CMPL_CASE")) {
	var gm = aa.appSpecificTableScript.getAppSpecificTableGroupModel(capId).getOutput();
	var ta = gm.getTablesArray()
	var tai = ta.iterator();
	var tableList = []
	var distDocs = []
	while (tai.hasNext()) {
		var tsm = tai.next();
		tableList.push(  String(tsm.getTableName()).replace(/[^a-zA-Z0-9]+/g,''))
	}
	logDebug(tableList)
	for(t in tableList) {
		eval("thisTable = " +tableList[t])
		logDebug(tableList[t] + ": rows " + thisTable.length)
		for (r=0; r<thisTable.length; r++) {
			logDebug(thisTable[r]["Document"])
			if(!matches(""+thisTable[r]["Document"], "", "null", "undefined")) distDocs.push(""+thisTable[r]["Document"])
		}
	}
	distDocs.sort()
	logDebug("Distinct Docs: " + distDocs.join(", "))
	editAppName(distDocs.join(", "))
}
	


//Script 50
if (wfTask == "Complaint Intake" && wfStatus == "ActiveAssigned") {
	var today = new Date()
	scheduleInspectDate("Initial Investigation",jsDateToASIDate(today),wfStaffUserID)
}


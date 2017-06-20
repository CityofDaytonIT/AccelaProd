/******* Testing *******

aa.env.setValue("asiField","Case Type");
aa.env.setValue("asiValue","Appeals of Zoning Admin Decision");
aa.env.setValue("appGroup","Building");
aa.env.setValue("appTypeType","Zoning Only");
aa.env.setValue("appSubtype","*");
aa.env.setValue("appCategory","*");
aa.env.setValue("appStatus","Submitted,Rejected,In Review")
aa.env.setValue("newStatus","Expired")
//aa.env.setValue("conType","Board of Zoning Appeals")
//aa.env.setValue("conName","Expired")

//***********************/
/*------------------------------------------------------------------------------------------------------/
| Client: Dayton
|
| Frequency: Daily
|
| Desc: Expire 'Zoning Only' 
|
/------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
|
| START: USER CONFIGURABLE PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
emailText = "";
maxSeconds = 4.5 * 60;		// number of seconds allowed for batch processing, usually < 5*60
message = "";
br = "<br>";
appTypeArray =[]
currentUserID = "ADMIN"
useAppSpecificGroupName = false
/*------------------------------------------------------------------------------------------------------/
| BEGIN Includes
/------------------------------------------------------------------------------------------------------*/
SCRIPT_VERSION = 2.0


emseBiz = aa.proxyInvoker.newInstance("com.accela.aa.emse.emse.EMSEBusiness").getOutput()
servProvCode = aa.getServiceProviderCode()

eval(""+emseBiz.getScriptByPK(servProvCode,"INCLUDES_ACCELA_FUNCTIONS","ADMIN").getScriptText())
eval(""+emseBiz.getScriptByPK(servProvCode,"INCLUDES_BATCH","ADMIN").getScriptText())
eval(""+emseBiz.getScriptByPK(servProvCode,"INCLUDES_CUSTOM","ADMIN").getScriptText())


/*------------------------------------------------------------------------------------------------------/
|
| END: USER CONFIGURABLE PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
showDebug = true//aa.env.getValue("showDebug").substring(0,1).toUpperCase().equals("Y");

sysDate = aa.date.getCurrentDate();
batchJobResult = aa.batchJob.getJobID()
batchJobName = "Test" //+ aa.env.getValue("BatchJobName");
wfObjArray = null;

batchJobID = 0;
if (batchJobResult.getSuccess()){
  batchJobID = batchJobResult.getOutput();
  logDebug("Batch Job " + batchJobName + " Job ID is " + batchJobID);
}
else
  logDebug("Batch job ID not found " + batchJobResult.getErrorMessage());

/*----------------------------------------------------------------------------------------------------/
|
| Start: BATCH PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/

var asiField = getParam("asiField");
var asiValue = getParam("asiValue");
var appGroup = getParam("appGroup");							// 
var appTypeType = getParam("appTypeType");						//   app type to process {Rental License}
var appSubtype = getParam("appSubtype");						//   app subtype to process {NA}
var appCategory = getParam("appCategory");						//   app category to process {NA}
var appStatusArray = getParam("appStatus").split(",");
var newStatus = getParam("newStatus");
var conType = getParam("conType");
var conName = getParam("conName");
var emailAddress = getParam("emailAddress");					// email to send report
var sendEmailToContactTypes = getParam("sendEmailToContactTypes");// send out emails?
var emailTemplate = getParam("emailTemplate");					// email Template

/*----------------------------------------------------------------------------------------------------/
|
| End: BATCH PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
var startDate = new Date();
var timeExpired = false;

var startTime = startDate.getTime();			// Start timer
var systemUserObj = aa.person.getUser("ADMIN").getOutput();

if (appGroup=="")	appGroup="*";
if (appTypeType=="")	appTypeType="*";
if (appSubtype=="")	appSubtype="*";
if (appCategory=="")	appCategory="*";
var appType = appGroup+"/"+appTypeType+"/"+appSubtype+"/"+appCategory;

/*------------------------------------------------------------------------------------------------------/
| <===========Main=Loop================>
|
/-----------------------------------------------------------------------------------------------------*/

logDebug("Start of Job");

if (!timeExpired) mainProcess();

logDebug("End of Job: Elapsed Time : " + elapsed() + " Seconds");

if (emailAddress.length)
	aa.sendMail("noreply@accela.com", emailAddress, "", batchJobName + " Results", emailText);

/*------------------------------------------------------------------------------------------------------/
| <===========END=Main=Loop================>
/-----------------------------------------------------------------------------------------------------*/

function mainProcess() {
	//Batch Variables
	var today = new Date()
	today.setHours(0,0,0,0)
	today.setDate(today.getDate()-31)
	var count = 0
	var countPlan = 0
	var recList = []
	var apporveDate = null
	
	//Batch Record Set
	var capModelResult = aa.cap.getCapModel();
	if (capModelResult.getSuccess()) {
		var capModel = capModelResult.getOutput();
		var capTypeModel = capModel.getCapType();
		if (appGroup != "*") capTypeModel.setGroup(appGroup);
		if (appTypeType != "*") capTypeModel.setType(appTypeType);
		if (appSubtype != "*") capTypeModel.setSubType(appSubtype);
		if (appCategory != "*") capTypeModel.setCategory(appCategory);
		capModel.setCapType(capTypeModel);
		for (s in appStatusArray) {
			capModel.setCapStatus(appStatusArray[s]);
			capResult = aa.cap.getCapIDListByCapModel(capModel);
			if (capResult.getSuccess()) {
				recList = recList.concat(capResult.getOutput())
			}
		}
	}
	 

	//Process Records
	logDebug("Processing " + recList.length + " records")

	for (i in recList)  {
		if (elapsed() > maxSeconds) {
			// only continue if time hasn't expired
			logDebug("A script time-out has caused partial completion of this process.  Please re-run.  " + elapsed() + " seconds elapsed, " + maxSeconds + " allowed.") ;
			timeExpired = true ;
			break;
		}
		thisRec =recList[i]
		capId = thisRec.getCapID();
		tmpCapObj = aa.cap.getCap(capId)
		altId = tmpCapObj.getSuccess() ? tmpCapObj.getOutput().getCapModel().getAltID() : null
		
		approveDate = "null"
		
		if (""+taskStatus("Application Submittal") != "Accepted") continue
		var approveDate = ""+taskStatusDate("Application Submittal")
		approveDateJS = (approveDate == "null") ? null : new Date(approveDate)
		
		//logDebug(br + altId + " - AppDate: "+approveDate+" expDate: "+today)
		if (approveDate != null && approveDateJS <= today) {
			willExpire = true
			childList = getChildren("Planning/Planning Case/NA/NA")
			for (c in childList) {
				thisChild = childList[c]
				if (""+getAppSpecific(asiField, thisChild) == asiValue) {
					logDebug(br + "Record: " + altId + " will not expire because it has a Planning Case of type 'Appeals of Zoning Admin Decision'")
					willExpire = false
					countPlan++
					break
				}
			}
			
			if (willExpire) {
				logDebug(br + "Expiring record: " + altId)
				updateAppStatus(newStatus, "Set by Script")
				count++
			}
		}
	}
	logDebug(br + "Expired " + count + " record" + (count == 1 ? "" : "s"))
	logDebug(br + "Not Expiring " + countPlan + " record" + (countPlan == 1 ? "" : "s") + " due to Planning Case")
}

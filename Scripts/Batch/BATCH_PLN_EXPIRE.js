/******* Testing *******

aa.env.setValue("appGroup","Planning");
aa.env.setValue("appTypeType","Planning Case");
aa.env.setValue("appSubtype","NA");
aa.env.setValue("appCategory","NA");
aa.env.setValue("appStatus","Staff Report Complete")
aa.env.setValue("newStatus","Expired")
aa.env.setValue("wTask","Case Complete")
aa.env.setValue("wStatus","Closed")
aa.env.setValue("conType","Case No Appeal")
aa.env.setValue("conName","No Appeal on Case")


//***********************/
/*------------------------------------------------------------------------------------------------------/
| Program: Batch Expiration.js  Trigger: Batch
| Client: South Metro Fire
|
| Frequency: Annually on January 31 (31 days after to December 31)
|
| Desc: This batch script sets the record status when the ASI field "Permit Expiration Date" is today or in the past
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
debug = ""
appTypeArray = []
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
batchJobName = "Expire License" //+ aa.env.getValue("BatchJobName");
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

var appGroup = getParam("appGroup");							//   app Group to process {Licenses}
var appTypeType = getParam("appTypeType");						//   app type to process {Rental License}
var appSubtype = getParam("appSubtype");						//   app subtype to process {NA}
var appCategory = getParam("appCategory");						//   app category to process {NA}
var appStatus = getParam("appStatus");
var newStatus = getParam("newStatus");
var wTask = getParam("wTask")
var wStatus = getParam("wStatus");
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
	var count = 0
	var today = new Date();
	today.setHours(0,0,0,0)
	today.setDate(today.getDate() - 29)

	//Batch Record Set
	var capModelResult = aa.cap.getCapModel();
	if (capModelResult.getSuccess()) {
		var capModel = capModelResult.getOutput();
		capModel.setCapStatus(appStatus);
		var capTypeModel = capModel.getCapType();
		if (appGroup != "*") capTypeModel.setGroup(appGroup);
		if (appTypeType != "*") capTypeModel.setType(appTypeType);
		if (appSubtype != "*") capTypeModel.setSubType(appSubtype);
		if (appCategory != "*") capTypeModel.setCategory(appCategory);
		capModel.setCapType(capTypeModel);
		capResult = aa.cap.getCapIDListByCapModel(capModel);
	}
	if (!capResult.getSuccess()) {
		logDebug("ERROR: Getting records, reason is: " + capResult.getErrorMessage()) ;
		return false
	} 

	//Process Records
	recList = capResult.getOutput();
	logDebug("Processing " + recList.length + " " + appType + " records" + br)
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
		
		wDate = (""+getWorkflowStatusDate(wTask, wStatus)).slice(0,10).replace(/-/g,"/")
		if (wDate == "null") continue
		var wDatejs = new Date(wDate);

		if (today > wDatejs) {
			logDebug(br +"Expiring record: " + altId)
			updateAppStatus(newStatus, "Set by Script")
			addStdCondition(conType,conName)
			count++
		}
	}
	logDebug(br + "Expired " + count + " record" + (count == 1 ? "" : "s"))
}

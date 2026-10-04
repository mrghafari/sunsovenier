export class LoadingError extends Error{
  constructor(message:string,public status=422,public code="LOADING_VALIDATION"){super(message);this.name="LoadingError";}
}